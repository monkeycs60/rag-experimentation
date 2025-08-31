import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ragService } from '@/lib/services/rag.service';
import { headers } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { confirm } = await request.json();
    
    if (!confirm) {
      return NextResponse.json({ error: 'Confirmation is required' }, { status: 400 });
    }

    await ragService.clearIndex();

    return NextResponse.json({
      success: true,
      message: 'Index cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing index:', error);
    return NextResponse.json(
      { error: 'Failed to clear index' },
      { status: 500 }
    );
  }
}