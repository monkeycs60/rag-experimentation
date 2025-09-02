import { getOrCreatePineconeIndex, getIndexNamespace } from "@/lib/services/pinecone";
import type { Index, RecordMetadata } from "@pinecone-database/pinecone";

export type RecentMemory = { id: string; text: string };

export async function fetchPersona(userId: string): Promise<string> {
  const ns = `mem:${userId || "anon"}`;
  try {
    const index = await getOrCreatePineconeIndex();
    const namespace = getIndexNamespace(index as Index<RecordMetadata>, ns);
    // @ts-ignore pinecone client compatibility layer
    const fetched = namespace.fetch
      ? await namespace.fetch(["persona"]) : await (index as any).fetch({ ids: ["persona"], namespace: ns });
    // support both SDK shapes
    const m: any = fetched?.records?.persona || fetched?.vectors?.persona;
    return (m?.metadata?.text as string | undefined) || "";
  } catch {
    return "";
  }
}

export async function fetchRecentMemories(userId: string): Promise<RecentMemory[]> {
  const ns = `mem:${userId || "anon"}`;
  try {
    const index = await getOrCreatePineconeIndex();
    const namespace = getIndexNamespace(index as Index<RecordMetadata>, ns);
    // Fetch recent meta
    // @ts-ignore pinecone client compatibility layer
    const fetched = namespace.fetch
      ? await namespace.fetch(["mem-meta"]) : await (index as any).fetch({ ids: ["mem-meta"], namespace: ns });
    const m: any = fetched?.records?.["mem-meta"] || fetched?.vectors?.["mem-meta"];
    let recent: string[] = [];
    try { recent = m?.metadata?.recent ? JSON.parse(m.metadata.recent) : []; } catch {}
    if (recent.length === 0) return [];
    // Fetch items by id
    // @ts-ignore pinecone client compatibility layer
    const fetchedItems = namespace.fetch
      ? await namespace.fetch(recent) : await (index as any).fetch({ ids: recent, namespace: ns });
    const recs: Record<string, any> = fetchedItems?.records || fetchedItems?.vectors || {};
    const items = recent
      .map((id) => ({ id, text: recs[id]?.metadata?.text as string | undefined }))
      .filter((x) => !!x.text)
      .slice(0, 3) as { id: string; text: string }[];
    return items;
  } catch {
    return [];
  }
}

