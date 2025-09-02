import { NextResponse } from "next/server";
import { getPinecone, getPineconeIndexName } from "@/lib/services/pinecone";

export const runtime = "nodejs";

export async function GET() {
  try {
    const name = getPineconeIndexName();
    const pc = getPinecone();
    const desc = await pc.describeIndex(name);
    return NextResponse.json({ ok: true, index: name, description: desc });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "Stats failed" }, { status: 500 });
  }
}

