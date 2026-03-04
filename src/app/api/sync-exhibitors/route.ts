import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { clearAllExhibitors, bulkAddExhibitors, getExhibitorStats } from '@/lib/db';
import { extractExhibitorDataFromPage } from '@/lib/htmlParser';

const API_URL = 'https://www.dpeurope.it/en/api/v1/filterDataObjects';
const ITEMS_PER_PAGE = 200;
const FOLDER_ID = '4769782';
const EXHIBITION_EDITION = '340290';

async function fetchPage(page: number): Promise<{ exhibitors: any[]; total?: number; pageCount?: number }> {
  try {
    const payload = {
      type: 'digital-profiles',
      folder: FOLDER_ID,
      itemsPerPage: ITEMS_PER_PAGE,
      exhibitionEdition: EXHIBITION_EDITION,
      page: page,
      searchText: '',
      category: '',
      country: '',
      pavilion: '',
      province: '',
      sub_category: '',
      tags: '',
    };

    console.log(`Fetching page ${page} with payload:`, payload);
    
    const response = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      timeout: 10000,
    });
    
    const data = response.data;

    console.log(`Page ${page} response keys:`, Object.keys(data));

    let exhibitors: any[] = [];
    let total = 0;
    let pageCount = 1;

    // Check if response has items array with HTML content
    if (data.items && Array.isArray(data.items)) {
      console.log(`Found ${data.items.length} items in response`);
      
      // Extract HTML from each item's content field
      for (const item of data.items) {
        if (item.content) {
          const itemExhibitors = extractExhibitorDataFromPage(item.content);
          exhibitors = [...exhibitors, ...itemExhibitors];
          console.log(`Extracted ${itemExhibitors.length} exhibitors from item`);
        }
      }
      
      // Use pagination info for accurate counts
      if (data.paginationVariables) {
        total = data.paginationVariables.totalCount || data.itemsCount || 0;
        pageCount = data.paginationVariables.pageCount || 1;
        console.log(`Pagination: page ${page}/${pageCount}, total: ${total} items`);
      } else {
        total = data.itemsCount || data.items.length || 0;
      }
      
      console.log(`Total extracted from this page: ${exhibitors.length} exhibitors`);
    } else if (data.content) {
      // Fallback for other response formats
      console.log(`Found HTML in data.content (${data.content.length} chars)`);
      exhibitors = extractExhibitorDataFromPage(data.content);
      total = data.total || data.itemCount || 0;
    }

    return { exhibitors, total, pageCount };
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    return { exhibitors: [], total: 0, pageCount: 1 };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if this is a status request
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'status') {
      const stats = await getExhibitorStats();
      return NextResponse.json(stats);
    }

    // Check if exhibitors already exist in database
    const currentStats = await getExhibitorStats();
    if (currentStats.total > 0) {
      console.log(`⚠️  Database already contains ${currentStats.total} exhibitors. Sync not allowed to prevent data loss.`);
      return NextResponse.json(
        {
          success: false,
          error: 'Exhibitors already synced',
          message: `Database already contains ${currentStats.total} exhibitors. Syncing again would reset all PV installer flags and notes.`,
          details: `Current data: ${currentStats.new} New, ${currentStats.contacted} Contacted, ${currentStats.successfulLeads} Successful, ${currentStats.rejected} Rejected, ${currentStats.pvInstallers} PV Installers`,
          existingData: currentStats,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Start fresh
    await clearAllExhibitors();
    let allExhibitors: any[] = [];
    let page = 1;
    let hasMore = true;
    let consecutiveEmptyPages = 0;

    console.log('🚀 Starting to fetch all exhibitors from:', API_URL);
    console.log(`   Edition: ${EXHIBITION_EDITION}, Folder: ${FOLDER_ID}`);
    console.log(`   Items per page: ${ITEMS_PER_PAGE}`);

    // Paginate through all results - keep fetching until we get empty pages
    while (hasMore) {
      console.log(`\n📄 Fetching page ${page}...`);
      const startCount = allExhibitors.length;
      const { exhibitors, total, pageCount } = await fetchPage(page);

      console.log(`   ├─ Received ${exhibitors.length} new exhibitors`);
      console.log(`   ├─ Cumulative loaded: ${startCount + exhibitors.length}`);

      if (exhibitors.length === 0) {
        consecutiveEmptyPages++;
        console.log(`   └─ ⚠️ Empty page detected (${consecutiveEmptyPages} consecutive)`);
        
        // Stop after 2 consecutive empty pages
        if (consecutiveEmptyPages >= 2) {
          console.log(`   └─ Stopping: ${consecutiveEmptyPages} consecutive empty pages`);
          hasMore = false;
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
        allExhibitors.push(...exhibitors);
      }

      page++;

      // Rate limiting delay
      if (hasMore && allExhibitors.length < 10000) {
        // Reasonable limit to prevent infinite loops
        console.log(`   ⏳ Waiting before next page...`);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log(`\n✅ Total exhibitors fetched: ${allExhibitors.length}`);

    // Store in database with verification
    if (allExhibitors.length > 0) {
      const exhibitorsToAdd = allExhibitors.map((exhibitor) => ({
        id: exhibitor.id,
        name: exhibitor.name,
        stand: exhibitor.stand || '',
        logo: exhibitor.logo || '',
        favAdd: exhibitor.favAdd || '',
        favRemove: exhibitor.favRemove || '',
        website: exhibitor.website || '',
        description: exhibitor.description,
        isPVInstaller: 0,
        status: 'New',
        notes: '',
      }));

      console.log(`\n💾 Saving ${exhibitorsToAdd.length} exhibitors to database...`);
      const startTime = Date.now();
      
      await bulkAddExhibitors(exhibitorsToAdd);
      
      const saveTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✨ Saved successfully in ${saveTime}s`);
      console.log(`📊 Database verification:`);
      console.log(`   ├─ Records written: ${exhibitorsToAdd.length}`);
      console.log(`   ├─ Unique IDs: ${new Set(exhibitorsToAdd.map(e => e.id)).size}`);
      console.log(`   └─ Timestamp: ${new Date().toISOString()}`);
    } else {
      console.log(`⚠️  No exhibitors to save`);
    }

    const stats = await getExhibitorStats();
    console.log(`\n📈 Final Statistics:`);
    console.log(`   ├─ Total in DB: ${stats.total}`);
    console.log(`   ├─ New: ${stats.new}`);
    console.log(`   ├─ Contacted: ${stats.contacted}`);
    console.log(`   ├─ Successful: ${stats.successfulLeads}`);
    console.log(`   ├─ Rejected: ${stats.rejected}`);
    console.log(`   └─ PV Installers: ${stats.pvInstallers}`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${allExhibitors.length} exhibitors`,
      stats,
      metadata: {
        itemsPerPage: ITEMS_PER_PAGE,
        pagesProcessed: page - 1,
        totalExhibitors: allExhibitors.length,
      },
    });
  } catch (error) {
    console.error('❌ Error in sync route:', error);
    return NextResponse.json(
      { error: 'Failed to sync exhibitors', details: String(error) },
      { status: 500 }
    );
  }
}
