import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const API_URL = 'https://www.dpeurope.it/en/api/v1/filterDataObjects';
    
    const results: any = {};

    // Test different parameter combinations
    const testCases = [
      {
        name: 'Current (dpeurope 1290720)',
        folder: '5015591',
        exhibitionEdition: '1290720',
      },
      {
        name: 'From curl (340290)',
        folder: '4769782',
        exhibitionEdition: '340290',
      },
      {
        name: 'Try different edition',
        folder: '5015591',
        exhibitionEdition: '340290',
      },
    ];

    for (const testCase of testCases) {
      const payload = {
        type: 'digital-profiles',
        folder: testCase.folder,
        itemsPerPage: 200,
        exhibitionEdition: testCase.exhibitionEdition,
        page: 1,
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
        results[testCase.name] = {
          folder: testCase.folder,
          exhibitionEdition: testCase.exhibitionEdition,
          itemsCount: data.items?.length || 0,
          totalCount: data.paginationVariables?.totalCount || 0,
          pageCount: data.paginationVariables?.pageCount || 0,
          success: true,
        };

        console.log(`${testCase.name}: ${data.items?.length || 0} items, total: ${data.paginationVariables?.totalCount || 0}`);
      } catch (error: any) {
        results[testCase.name] = {
          folder: testCase.folder,
          exhibitionEdition: testCase.exhibitionEdition,
          error: error.message,
          success: false,
        };
        console.error(`${testCase.name} failed:`, error.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      testResults: results,
      instruction: 'Please share which test case shows the correct number of exhibitors (~1000)',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
