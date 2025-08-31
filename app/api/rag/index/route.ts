import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ragService } from '@/lib/services/rag.service';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdfDirectory } = await request.json();
    
    if (!pdfDirectory) {
      return NextResponse.json({ error: 'PDF directory is required' }, { status: 400 });
    }

    const result = await ragService.indexDocuments(pdfDirectory);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${result.chunksProcessed} chunks`,
      chunksProcessed: result.chunksProcessed,
    });
  } catch (error) {
    console.error('Error indexing documents:', error);
    return NextResponse.json(
      { error: 'Failed to index documents' },
      { status: 500 }
    );
  }
}