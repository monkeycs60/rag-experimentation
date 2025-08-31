import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export interface PineconeDocument {
  id: string;
  values: number[];
  metadata: {
    text: string;
    fileName: string;
    pageNumber?: number;
    chunkIndex: number;
    author?: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: {
    text: string;
    fileName: string;
    pageNumber?: number;
    chunkIndex: number;
    author?: string;
  };
}

const INDEX_NAME = 'rag-documents';
const VECTOR_DIMENSION = 3072; // text-embedding-3-large dimension

export class PineconeService {
  private index = pc.index(INDEX_NAME);

  async ensureIndexExists(): Promise<void> {
    try {
      const indexes = await pc.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);
      
      if (!indexExists) {
        await pc.createIndex({
          name: INDEX_NAME,
          dimension: VECTOR_DIMENSION,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error('Error ensuring index exists:', error);
      throw error;
    }
  }

  async upsertDocuments(documents: PineconeDocument[]): Promise<void> {
    try {
      await this.ensureIndexExists();
      
      // Batch upsert documents
      const batchSize = 100;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await this.index.upsert(batch);
      }
    } catch (error) {
      console.error('Error upserting documents:', error);
      throw error;
    }
  }

  async searchSimilar(queryVector: number[], topK: number = 5): Promise<SearchResult[]> {
    try {
      await this.ensureIndexExists();
      
      const response = await this.index.query({
        vector: queryVector,
        topK,
        includeValues: false,
        includeMetadata: true,
      });

      return response.matches?.map(match => ({
        id: match.id!,
        score: match.score!,
        metadata: match.metadata as SearchResult['metadata'],
      })) || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  async deleteAllDocuments(): Promise<void> {
    try {
      await this.ensureIndexExists();
      await this.index.deleteAll();
    } catch (error) {
      console.error('Error deleting all documents:', error);
      throw error;
    }
  }

  async getIndexStats(): Promise<{ totalVectors: number }> {
    try {
      await this.ensureIndexExists();
      const stats = await this.index.describeIndexStats();
      return {
        totalVectors: stats.totalVectorCount || 0,
      };
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }
}

export const pineconeService = new PineconeService();