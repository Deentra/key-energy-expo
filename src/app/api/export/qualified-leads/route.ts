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
    
    // Filter: Records with status changes (not "New") OR notes OR PV installer flag
    const qualifiedLeads = exhibitors.filter(e => 
      (e.status && e.status !== 'New') || (e.notes && e.notes.length > 0) || (e.isPVInstaller === 1)
    );
    
    // Enrich with more readable data
    const enrichedLeads = qualifiedLeads.map(lead => ({
      'Company Name': lead.name,
      'Stand': lead.stand,
      'Website': lead.website,
      'Description': lead.description || '',
      'Status': lead.status,
      'Notes': lead.notes,
      'PV Installer': lead.isPVInstaller === 1 ? 'Yes' : 'No',
      'Last Updated': new Date().toISOString().split('T')[0],
    }));
    
    const csv = arrayToCSV(enrichedLeads);
    const filename = `qualified-leads-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting qualified leads:', error);
    return NextResponse.json(
      { error: 'Failed to export leads', details: String(error) },
      { status: 500 }
    );
  }
}
