import { getAllExhibitors, updateExhibitorPVStatus } from '@/lib/db';

const PV_KEYWORDS = [
  'photovoltaic',
  'pv installer',
  'solar',
  'solar panel',
  'photovoltaik',
  'módulo fotovoltaico',
  'energia solar',
  'energia rinnovabile',
  'renewable energy',
  'pannelli solari',
  'installatore solare',
  'solar installer',
  'pv system',
  'solar system',
  'siemens smart',
  'hybrid energy',
];

function isPVInstaller(name: string, description: string = ''): boolean {
  const text = `${name} ${description}`.toLowerCase();
  return PV_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

export async function POST() {
  try {
    const exhibitors = await getAllExhibitors();
    
    if (!exhibitors || exhibitors.length === 0) {
      return Response.json({
        success: false,
        message: 'No exhibitors found in database',
        recognized: 0,
      }, { status: 400 });
    }

    let recognizedCount = 0;
    const recognizedIds: string[] = [];

    // Analyze each exhibitor
    for (const exhibitor of exhibitors) {
      if (!exhibitor.isPVInstaller && isPVInstaller(exhibitor.name, exhibitor.description)) {
        recognizedCount++;
        recognizedIds.push(exhibitor.id);
        await updateExhibitorPVStatus(exhibitor.id, 1);
      }
    }

    return Response.json({
      success: true,
      message: `Recognized ${recognizedCount} potential PV installers`,
      recognized: recognizedCount,
      recognizedIds,
    });
  } catch (error) {
    console.error('Error recognizing PV installers:', error);
    return Response.json(
      { success: false, message: 'Failed to recognize PV installers', error: String(error) },
      { status: 500 }
    );
  }
}
