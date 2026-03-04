import { getAllExhibitors } from '@/lib/db';
import { NextResponse } from 'next/server';

function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(h => `"${h}"`).join(',');
  
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

export async function GET() {
  try {
    const exhibitors = await getAllExhibitors();
    
    // Filter: PV Installers
    const pvLeads = exhibitors.filter(e => e.isPVInstaller === 1);
    
    const csv = arrayToCSV(pvLeads);
    const filename = `pv-leads-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting PV leads:', error);
    return NextResponse.json(
      { error: 'Failed to export PV leads', details: String(error) },
      { status: 500 }
    );
  }
}
