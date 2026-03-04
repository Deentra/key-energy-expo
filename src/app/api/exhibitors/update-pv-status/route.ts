import { NextRequest, NextResponse } from 'next/server';
import { updateExhibitorPVStatus } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { exhibitorId, isPVInstaller } = await request.json();

    if (!exhibitorId) {
      return NextResponse.json(
        { error: 'exhibitorId is required' },
        { status: 400 }
      );
    }

    await updateExhibitorPVStatus(exhibitorId, isPVInstaller ? 1 : 0);

    return NextResponse.json({
      success: true,
      message: `Exhibitor ${isPVInstaller ? 'marked as' : 'unmarked from'} PV installer`,
    });
  } catch (error) {
    console.error('Error updating PV status:', error);
    return NextResponse.json(
      { error: 'Failed to update PV status' },
      { status: 500 }
    );
  }
}
