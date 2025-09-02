import { Pinecone, ServerlessSpecCloudEnum } from "@pinecone-database/pinecone";

let client: Pinecone | null = null;

export function getPinecone() {
  if (client) return client;
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
  client = new Pinecone({ apiKey });
  return client;
}

export async function getOrCreatePineconeIndex() {
  const indexName =
    process.env.PINECONE_INDEX || process.env.PINECONE_INDEX_NAME || "pdf-rag";
  if (!indexName) throw new Error("Pinecone index name not configured");
  const dimension = Number(process.env.PINECONE_DIMENSION || 1536);
  const pc = getPinecone();
  const existing = await pc.listIndexes();
  const has = existing.indexes?.some((i) => i.name === indexName);
  if (!has) {
    const cloud = (process.env.PINECONE_CLOUD ||
			'aws') as ServerlessSpecCloudEnum;
    const region = process.env.PINECONE_REGION || "us-east-1";
    await pc.createIndex({
      name: indexName,
      dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud,
          region,
        },
      },
    });
    // Optionally wait until ready (best-effort)
    try {
      for (let i = 0; i < 30; i++) {
        const desc = await pc.describeIndex(indexName);
        if ((desc as unknown as { status: { ready: boolean } })?.status?.ready) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch {}
  }
  return pc.index(indexName);
}
