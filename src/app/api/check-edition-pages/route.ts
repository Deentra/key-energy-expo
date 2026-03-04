import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const API_URL = 'https://www.dpeurope.it/en/api/v1/filterDataObjects';
    
    const results: any[] = [];

    // Check pages 1-10 for edition 340290
    for (let page = 1; page <= 10; page++) {
      const payload = {
        type: 'digital-profiles',
        folder: '4769782',
        itemsPerPage: 200,
        exhibitionEdition: '340290',
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

        results.push({
          page,
          itemsOnThisPage: itemCount,
          totalFromAPI: data.paginationVariables?.totalCount || 0,
          pageCount: data.paginationVariables?.pageCount || 0,
        });

        console.log(`Page ${page}: ${itemCount} items`);

        // Stop if page is empty
        if (itemCount === 0) {
          console.log(`Stopping at empty page ${page}`);
          break;
        }
      } catch (error: any) {
        console.error(`Error on page ${page}:`, error.message);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const totalItems = results.reduce((sum, r) => sum + r.itemsOnThisPage, 0);

    return NextResponse.json({
      edition: '340290',
      folder: '4769782',
      pagesProcessed: results.length,
      totalItemsFetched: totalItems,
      pageDetails: results,
      estimatedTotalFromFirstPage: results[0]?.totalFromAPI,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
