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

    const { query, topK = 5, minRelevanceScore = 0.7 } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = await ragService.searchDocuments(query, topK, minRelevanceScore);
    const contextualAnswer = await ragService.generateContextualAnswer(query, results);

    return NextResponse.json({
      success: true,
      results,
      contextualAnswer,
      totalResults: results.length,
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    );
  }
}