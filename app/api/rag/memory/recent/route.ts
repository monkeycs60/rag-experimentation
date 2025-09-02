import { NextResponse } from "next/server";
import { getTypedSession } from "@/lib/auth-helpers";
import { getOrCreatePineconeIndex, getIndexNamespace } from "@/lib/services/pinecone";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getTypedSession();
    const userId = session?.user?.id || "anon";
    const memNs = `mem:${userId}`;
    const index = await getOrCreatePineconeIndex();
    const namespace = getIndexNamespace(index as any, memNs);
    // Fetch recent meta
    // @ts-ignore
    const fetched = namespace.fetch
      ? await namespace.fetch(["mem-meta"]) : await (index as any).fetch({ ids: ["mem-meta"], namespace: memNs });
    const m: any = fetched?.records?.["mem-meta"] || fetched?.vectors?.["mem-meta"];
    let recent: string[] = [];
    try { recent = m?.metadata?.recent ? JSON.parse(m.metadata.recent) : []; } catch {}
    if (recent.length === 0) return NextResponse.json({ ok: true, items: [] });
    // Fetch the recent items by id
    // @ts-ignore
    const fetchedItems = namespace.fetch
      ? await namespace.fetch(recent) : await (index as any).fetch({ ids: recent, namespace: memNs });
    const recs: Record<string, any> = fetchedItems?.records || fetchedItems?.vectors || {};
    const items = recent
      .map((id) => ({ id, text: recs[id]?.metadata?.text as string | undefined }))
      .filter((x) => !!x.text)
      .slice(0, 3);
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Recent fetch failed" }, { status: 500 });
  }
}

