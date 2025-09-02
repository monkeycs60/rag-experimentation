import { NextResponse } from "next/server";
import { loadLocalPdfs, chunkText } from "@/lib/services/pdf";
import { embedTexts } from "@/lib/services/embedding";
import { getOrCreatePineconeIndex } from "@/lib/services/pinecone";
import { RecordMetadata } from "@pinecone-database/pinecone";

export const runtime = "nodejs";

export async function POST() {
  try {
    const pdfs = await loadLocalPdfs();
    if (pdfs.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No PDFs found in ./pdf" },
        { status: 400 }
      );
    }

    const index = await getOrCreatePineconeIndex();

    let totalChunks = 0;
    for (const doc of pdfs) {
      const chunks = chunkText(doc.text);
      totalChunks += chunks.length;
      const texts = chunks.map((c) => c.content);
      const vectors = await embedTexts(texts);
      const upserts = vectors.map((values, i) => ({
        id: `${doc.id}-${i}`,
        values,
        metadata: {
          source: doc.id,
          page: i,
          text: chunks[i].content,
        } as RecordMetadata,
      }));
      // Batch in small groups to avoid payload limits
      const batchSize = 100;
      for (let i = 0; i < upserts.length; i += batchSize) {
        const slice = upserts.slice(i, i + batchSize);
        await index.upsert(slice);
      }
    }

    return NextResponse.json({ ok: true, message: `Indexed ${pdfs.length} PDFs (${totalChunks} chunks)` });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Indexing failed" }, { status: 500 });
  }
}
