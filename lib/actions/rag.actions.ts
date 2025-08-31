import { authenticatedAction } from './safe-action';
import { ragService } from '@/lib/services/rag.service';
import { z } from 'zod';

const indexDocumentsSchema = z.object({
  pdfDirectory: z.string().min(1, 'PDF directory path is required'),
});

const searchDocumentsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  topK: z.number().min(1).max(20).optional().default(5),
  minRelevanceScore: z.number().min(0).max(1).optional().default(0.7),
});

const deleteIndexSchema = z.object({
  confirm: z.boolean().refine(val => val === true, 'Confirmation is required'),
});

export const indexDocumentsAction = authenticatedAction
  .schema(indexDocumentsSchema)
  .action(async ({ parsedInput: { pdfDirectory } }) => {
    try {
      const result = await ragService.indexDocuments(pdfDirectory);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        message: `Successfully indexed ${result.chunksProcessed} chunks`,
        chunksProcessed: result.chunksProcessed,
      };
    } catch (error) {
      throw new Error(`Failed to index documents: ${error}`);
    }
  });

export const searchDocumentsAction = authenticatedAction
  .schema(searchDocumentsSchema)
  .action(async ({ parsedInput: { query, topK, minRelevanceScore } }) => {
    try {
      const results = await ragService.searchDocuments(query, topK, minRelevanceScore);
      
      // Generate contextual answer
      const contextualAnswer = await ragService.generateContextualAnswer(query, results);
      
      return {
        success: true,
        results,
        contextualAnswer,
        totalResults: results.length,
      };
    } catch (error) {
      throw new Error(`Failed to search documents: ${error}`);
    }
  });

export const getIndexStatsAction = authenticatedAction
  .schema(z.object({}))
  .action(async () => {
    try {
      const stats = await ragService.getIndexStats();
      
      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new Error(`Failed to get index stats: ${error}`);
    }
  });

export const deleteIndexAction = authenticatedAction
  .schema(deleteIndexSchema)
  .action(async ({ parsedInput: { confirm } }) => {
    try {
      if (!confirm) {
        throw new Error('Deletion not confirmed');
      }

      await ragService.clearIndex();
      
      return {
        success: true,
        message: 'Index cleared successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete index: ${error}`);
    }
  });