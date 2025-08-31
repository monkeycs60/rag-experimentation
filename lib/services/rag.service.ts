import { pdfService, type PdfChunk } from './pdf.service';
import { embeddingsService } from './embeddings.service';
import { pineconeService, type PineconeDocument, type SearchResult } from './pinecone.service';

export interface IndexingProgress {
  currentFile: string;
  processedFiles: number;
  totalFiles: number;
  processedChunks: number;
  totalChunks: number;
}

export interface RagSearchResult extends SearchResult {
  relevanceScore: number;
}

export class RagService {
  async indexDocuments(
    pdfDirectory: string,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<{ success: true; chunksProcessed: number } | { success: false; error: string }> {
    try {
      // Extract text from all PDFs
      const chunks = await pdfService.processAllPdfs(pdfDirectory);
      
      if (chunks.length === 0) {
        return { success: false, error: 'No PDF files found or no content extracted' };
      }

      const totalChunks = chunks.length;
      const uniqueFiles = [...new Set(chunks.map(c => c.fileName))];
      
      // Generate embeddings for all chunks
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await embeddingsService.generateEmbeddingsInBatches(texts, 20);
      
      // Prepare documents for Pinecone
      const documents: PineconeDocument[] = chunks.map((chunk, index) => ({
        id: `${chunk.fileName}_chunk_${chunk.chunkIndex}`,
        values: embeddings[index],
        metadata: {
          text: chunk.text,
          fileName: chunk.fileName,
          chunkIndex: chunk.chunkIndex,
          author: chunk.author,
          pageNumber: chunk.pageNumber,
        },
      }));

      // Progress tracking during embedding generation
      if (onProgress) {
        onProgress({
          currentFile: 'Generating embeddings...',
          processedFiles: uniqueFiles.length,
          totalFiles: uniqueFiles.length,
          processedChunks: totalChunks,
          totalChunks,
        });
      }

      // Upsert to Pinecone
      await pineconeService.upsertDocuments(documents);
      
      return { success: true, chunksProcessed: totalChunks };
    } catch (error) {
      console.error('Error indexing documents:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async searchDocuments(
    query: string,
    topK: number = 5,
    minRelevanceScore: number = 0.7
  ): Promise<RagSearchResult[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await embeddingsService.generateSingleEmbedding(query);
      
      // Search in Pinecone
      const results = await pineconeService.searchSimilar(queryEmbedding, topK * 2); // Get more results to filter
      
      // Filter by relevance score and format results
      const relevantResults: RagSearchResult[] = results
        .filter(result => result.score >= minRelevanceScore)
        .slice(0, topK)
        .map(result => ({
          ...result,
          relevanceScore: Math.round(result.score * 100) / 100, // Round to 2 decimal places
        }));
      
      return relevantResults;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error(`Failed to search documents: ${error}`);
    }
  }

  async getIndexStats(): Promise<{
    totalVectors: number;
    uniqueDocuments: string[];
  }> {
    try {
      const stats = await pineconeService.getIndexStats();
      
      // For now, we'll return basic stats
      // In a real implementation, you might want to query for unique document names
      return {
        totalVectors: stats.totalVectors,
        uniqueDocuments: [], // Could be populated by querying metadata
      };
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }

  async clearIndex(): Promise<void> {
    try {
      await pineconeService.deleteAllDocuments();
    } catch (error) {
      console.error('Error clearing index:', error);
      throw error;
    }
  }

  async generateContextualAnswer(
    query: string,
    searchResults: RagSearchResult[]
  ): Promise<string> {
    if (searchResults.length === 0) {
      return 'Aucun document pertinent trouvé pour répondre à votre question.';
    }

    // Combine the most relevant chunks for context
    const context = searchResults
      .slice(0, 3) // Use top 3 results
      .map(result => `[${result.metadata.fileName} - ${result.metadata.author || 'Auteur inconnu'}]: ${result.metadata.text}`)
      .join('\n\n');

    // Return context for now - in a real implementation, you'd use an LLM to generate an answer
    return `Contexte trouvé (${searchResults.length} résultats pertinents):\n\n${context}`;
  }
}

export const ragService = new RagService();