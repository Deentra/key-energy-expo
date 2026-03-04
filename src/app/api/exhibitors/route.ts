import { NextRequest, NextResponse } from 'next/server';
import { getAllExhibitors, searchExhibitors } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const isPVInstaller = searchParams.get('isPVInstaller');
    const stand = searchParams.get('stand');

    let exhibitors;

    if (query) {
      exhibitors = await searchExhibitors(query, {
        status: status || undefined,
        isPVInstaller: isPVInstaller === 'true',
        stand: stand || undefined,
      });
    } else {
      exhibitors = await getAllExhibitors();

      // Apply filters if no search query
      if (status && status !== 'All') {
        exhibitors = exhibitors.filter((e) => e.status === status);
      }
      if (isPVInstaller === 'true') {
        exhibitors = exhibitors.filter((e) => e.isPVInstaller);
      }
      if (stand) {
        exhibitors = exhibitors.filter((e) => e.stand?.includes(stand));
      }
    }

    return NextResponse.json(exhibitors);
  } catch (error) {
    console.error('Error fetching exhibitors:', error);
    return NextResponse.json({ error: 'Failed to fetch exhibitors' }, { status: 500 });
  }
}
