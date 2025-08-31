import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ragService } from '@/lib/services/rag.service';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await ragService.getIndexStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting index stats:', error);
    return NextResponse.json(
      { error: 'Failed to get index stats' },
      { status: 500 }
    );
  }
}