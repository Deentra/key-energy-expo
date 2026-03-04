import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const API_URL = 'https://www.dpeurope.it/en/api/v1/filterDataObjects';
    
    const payload = {
      type: 'digital-profiles',
      folder: '5015591',
      itemsPerPage: 55,
      exhibitionEdition: '1290720',
      page: 1,
      searchText: '',
      category: '',
      country: '',
      pavilion: '',
      province: '',
      sub_category: '',
      tags: '',
    };

    const response = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    const data = response.data;

    // Get first 2000 chars of each major field
    const preview: any = {
      contentType: response.headers['content-type'],
      topLevelKeys: Object.keys(data),
      dataTypeOfResponse: typeof data,
      isArray: Array.isArray(data),
    };

    // Check all top-level keys and their types
    for (const key of Object.keys(data).slice(0, 20)) {
      const value = data[key];
      preview[key] = {
        type: typeof value,
        isArray: Array.isArray(value),
        length: Array.isArray(value) ? value.length : typeof value === 'string' ? value.length : undefined,
        preview: typeof value === 'string' ? value.substring(0, 200) : Array.isArray(value) ? `[${value.length} items]` : value,
      };
    }

    // If data is array, show first item
    if (Array.isArray(data) && data.length > 0) {
      preview.firstArrayItem = data[0];
    }

    // Full raw response (truncated)
    preview.fullResponsePreview = JSON.stringify(data).substring(0, 2000);

    return NextResponse.json(preview, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
    }, { status: 500 });
  }
}
