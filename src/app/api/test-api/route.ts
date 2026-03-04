import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_URL = 'https://www.dpeurope.it/en/api/v1/filterDataObjects/default';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing API connection...');

    const params = {
      type: 'digital-profiles',
      folder: '5015591',
      itemsPerPage: 55,
      exhibitionEdition: '1290720',
      page: 1,
    };

    console.log('📤 Sending request to:', API_URL);
    console.log('📋 With params:', params);

    const response = await axios.get(API_URL, { params });

    const data = response.data;

    return NextResponse.json({
      statusCode: response.status,
      responseKeys: Object.keys(data),
      contentLength: data.content?.length || 0,
      contentType: typeof data.content,
      contentPreview: data.content?.substring(0, 500) || 'No content',
      totalField: data.total || 'Not found',
      itemCountField: data.itemCount || 'Not found',
      allFields: {
        total: data.total,
        itemCount: data.itemCount,
        page: data.page,
        items: data.items?.length,
        hasContent: !!data.content,
      },
    });
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data?.substring?.(0, 500),
      },
      { status: 500 }
    );
  }
}
