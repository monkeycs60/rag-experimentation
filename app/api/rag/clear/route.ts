import { NextResponse } from "next/server";
import { getOrCreatePineconeIndex, getPineconeIndexName, getPinecone } from "@/lib/services/pinecone";

export const runtime = "nodejs";

export async function POST() {
  try {
    const indexName = getPineconeIndexName();
    const idx = await getOrCreatePineconeIndex();
    // In some SDK versions, deleteAll exists on the index instance
    // Fallback: use client level operation if needed.
    if (typeof (idx as { deleteAll: () => Promise<void> }).deleteAll === "function") {
      await (idx as { deleteAll: () => Promise<void> }).deleteAll();
    } else {
      const pc = getPinecone();
      if (typeof (pc as { deleteIndex: (indexName: string) => Promise<void> }).deleteIndex === "function") {
        // Recreate index quickly for a clean slate
        await (pc as { deleteIndex: (indexName: string) => Promise<void> }).deleteIndex(indexName);
      }
    }
    return NextResponse.json({ ok: true, message: "Index cleared" });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "Clear failed" }, { status: 500 });
  }
}

