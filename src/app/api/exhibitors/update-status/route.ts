import { NextRequest, NextResponse } from 'next/server';
import { updateExhibitorStatus } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    await updateExhibitorStatus(id, status, notes || '');

    return NextResponse.json({ success: true, message: 'Exhibitor updated' });
  } catch (error) {
    console.error('Error updating exhibitor:', error);
    return NextResponse.json(
      { error: 'Failed to update exhibitor' },
      { status: 500 }
    );
  }
}
