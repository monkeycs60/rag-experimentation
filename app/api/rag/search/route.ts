import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/services/embedding";
import { getOrCreatePineconeIndex } from "@/lib/services/pinecone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { query, topK = 5 } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ ok: false, error: "Missing query" }, { status: 400 });
    }
    const index = await getOrCreatePineconeIndex();
    const vector = await embedText(query);
    const result = await index.query({
      topK: Number(topK) || 5,
      vector,
      includeMetadata: true,
    });
    const matches = (result.matches || []).map((m) => ({
      id: m.id,
      score: m.score,
      text: (m.metadata as any)?.text as string | undefined,
      source: (m.metadata as any)?.source as string | undefined,
    }));
    return NextResponse.json({ ok: true, matches });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Search failed" }, { status: 500 });
  }
}
