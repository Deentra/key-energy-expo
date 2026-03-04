import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const API_URL = 'https://www.dpeurope.it/en/api/v1/filterDataObjects';
    
    const results: any[] = [];

    // Check pages 1-7 to see which ones have data
    for (let page = 1; page <= 7; page++) {
      const payload = {
        type: 'digital-profiles',
        folder: '5015591',
        itemsPerPage: 200,
        exhibitionEdition: '1290720',
        page: page,
        searchText: '',
        category: '',
        country: '',
        pavilion: '',
        province: '',
        sub_category: '',
        tags: '',
      };

      try {
        const response = await axios.post(API_URL, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });

        const data = response.data;
        const itemCount = data.items?.length || 0;
        const totalCount = data.paginationVariables?.totalCount || data.itemsCount || 0;
        const pageCount = data.paginationVariables?.pageCount || 1;

        results.push({
          page,
          itemsOnThisPage: itemCount,
          totalCountFromAPI: totalCount,
          pageCountFromAPI: pageCount,
          hasItems: itemCount > 0,
          paginationInfo: data.paginationVariables,
        });

        console.log(`Page ${page}: ${itemCount} items, total: ${totalCount}, pageCount: ${pageCount}`);

        // Stop if this page is empty and we're past page 1
        if (itemCount === 0 && page > 1) {
          console.log(`Stopping at page ${page} (empty)`);
          break;
        }
      } catch (error: any) {
        console.error(`Error fetching page ${page}:`, error.message);
        results.push({
          page,
          error: error.message,
        });
        break;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      pagesChecked: results.length,
      results,
      summary: {
        totalPagesWithData: results.filter((r) => r.hasItems).length,
        totalItemsAcrossPages: results.reduce((sum, r) => sum + (r.itemsOnThisPage || 0), 0),
        firstPageTotalCount: results[0]?.totalCountFromAPI,
        firstPagePageCount: results[0]?.pageCountFromAPI,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
    }, { status: 500 });
  }
}
