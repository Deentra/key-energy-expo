import { getAllExhibitors } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const exhibitors = await getAllExhibitors();
    
    const backup = {
      exportDate: new Date().toISOString(),
      totalRecords: exhibitors.length,
      data: exhibitors,
    };

    const filename = `exhibitors-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error creating database backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: String(error) },
      { status: 500 }
    );
  }
}
