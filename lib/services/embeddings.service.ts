import { openai } from '@ai-sdk/openai';
import { embedMany, embed } from 'ai';

export class EmbeddingsService {
  private readonly model = openai.textEmbeddingModel('text-embedding-3-large');

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      const { embeddings } = await embedMany({
        model: this.model,
        values: texts,
      });

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  async generateSingleEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: this.model,
        value: text,
      });

      return embedding;
    } catch (error) {
      console.error('Error generating single embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateEmbeddingsInBatches(
    texts: string[], 
    batchSize: number = 20
  ): Promise<number[][]> {
    try {
      const allEmbeddings: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await this.generateEmbeddings(batch);
        allEmbeddings.push(...batchEmbeddings);
        
        // Small delay to avoid rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return allEmbeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }
}

export const embeddingsService = new EmbeddingsService();