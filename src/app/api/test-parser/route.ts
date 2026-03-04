import { NextRequest, NextResponse } from 'next/server';
import { extractExhibitorDataFromPage } from '@/lib/htmlParser';

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();

    if (!html) {
      return NextResponse.json(
        { error: 'No HTML provided' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing HTML extraction (${html.length} chars)`);
    const exhibitors = extractExhibitorDataFromPage(html);

    return NextResponse.json({
      success: true,
      exhibitorsFound: exhibitors.length,
      exhibitors: exhibitors.slice(0, 3),
      htmlLength: html.length,
    });
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
