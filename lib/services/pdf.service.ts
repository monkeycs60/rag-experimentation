import fs from 'fs';

// Dynamic import function to avoid build-time execution
async function getPdfParser() {
  const pdf = await import('pdf-parse');
  return pdf.default;
}

export interface PdfChunk {
  text: string;
  chunkIndex: number;
  fileName: string;
  pageNumber?: number;
  author?: string;
}

export class PdfService {
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;

  async extractTextFromPdf(filePath: string): Promise<{
    text: string;
    numPages: number;
    fileName: string;
    author?: string;
  }> {
    try {
      const buffer = fs.readFileSync(filePath);
      const pdf = await getPdfParser();
      const data = await pdf(buffer);
      
      const fileName = filePath.split('/').pop() || 'unknown';
      
      // Extract author from metadata if available
      const author = data.info?.Author || this.extractAuthorFromFileName(fileName);
      
      return {
        text: data.text,
        numPages: data.numpages,
        fileName,
        author,
      };
    } catch (error) {
      console.error(`Error extracting text from PDF ${filePath}:`, error);
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  private extractAuthorFromFileName(fileName: string): string | undefined {
    // Simple heuristic to extract author from filename
    const cleanName = fileName.replace(/\.pdf$/i, '');
    const parts = cleanName.split(/[-_\s]/);
    
    // Look for common author patterns
    if (parts.length > 0) {
      const potentialAuthor = parts[0];
      if (potentialAuthor.length > 2) {
        return this.capitalizeAuthor(potentialAuthor);
      }
    }
    
    return undefined;
  }

  private capitalizeAuthor(author: string): string {
    return author
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  chunkText(text: string, fileName: string, author?: string): PdfChunk[] {
    const chunks: PdfChunk[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed chunk size, save current chunk
      if (currentChunk.length + sentence.length > this.CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          chunkIndex,
          fileName,
          author,
        });
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 6)); // Approximate words for overlap
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
        chunkIndex++;
      } else {
        currentChunk += sentence + ' ';
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        chunkIndex,
        fileName,
        author,
      });
    }
    
    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Clean and normalize the text
    const cleanText = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    // Split on sentence boundaries
    const sentences = cleanText.split(/(?<=[.!?])\s+(?=[A-Z])/);
    
    return sentences.filter(sentence => sentence.trim().length > 0);
  }

  async processAllPdfs(pdfDirectory: string): Promise<PdfChunk[]> {
    try {
      const files = fs.readdirSync(pdfDirectory);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
      
      const allChunks: PdfChunk[] = [];
      
      for (const pdfFile of pdfFiles) {
        const filePath = `${pdfDirectory}/${pdfFile}`;
        const { text, fileName, author } = await this.extractTextFromPdf(filePath);
        const chunks = this.chunkText(text, fileName, author);
        allChunks.push(...chunks);
      }
      
      return allChunks;
    } catch (error) {
      console.error('Error processing PDFs:', error);
      throw new Error(`Failed to process PDFs: ${error}`);
    }
  }
}

export const pdfService = new PdfService();