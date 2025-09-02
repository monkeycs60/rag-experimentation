import { NextRequest, NextResponse } from "next/server";
import { getOrCreatePineconeIndex, getIndexNamespace } from "@/lib/services/pinecone";
import { embedText } from "@/lib/services/embedding";
import { getTypedSession } from "@/lib/auth-helpers";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { persona } = await req.json();
    if (!persona || typeof persona !== "string") {
      return NextResponse.json({ ok: false, error: "Missing persona" }, { status: 400 });
    }
    const session = await getTypedSession();
    const userId = session?.user?.id || "anon";
    const ns = `mem:${userId}`;
    const index = await getOrCreatePineconeIndex();
    const namespace = getIndexNamespace(index as Index<RecordMetadata>, ns);
    const vector = await embedText(persona);
    // Upsert persona with fixed id for easy updates
    const upsert = [{ id: `persona`, values: vector, metadata: { type: "persona", text: persona } as RecordMetadata }];
    await (namespace.upsert ? namespace.upsert(upsert) : (index as { upsert: (upsert: { id: string; values: number[]; metadata: RecordMetadata }[], options: { namespace: string }) => Promise<void> }).upsert(upsert, { namespace: ns }));
    return NextResponse.json({ ok: true, message: "Persona saved" });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "Persona save failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getTypedSession();
    const userId = session?.user?.id || "anon";
    const ns = `mem:${userId}`;
    const index = await getOrCreatePineconeIndex();
    const namespace = getIndexNamespace(index as any, ns);
    // @ts-ignore
    const fetched = namespace.fetch
      ? await namespace.fetch(["persona"]) : await (index as any).fetch({ ids: ["persona"], namespace: ns });
    const m: any = fetched?.records?.persona || fetched?.vectors?.persona;
    const text = m?.metadata?.text || "";
    return NextResponse.json({ ok: true, persona: text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Persona fetch failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getTypedSession();
    const userId = session?.user?.id || "anon";
    const ns = `mem:${userId}`;
    const index = await getOrCreatePineconeIndex();
    const namespace = getIndexNamespace(index as any, ns);
    // @ts-ignore
    if (typeof namespace.deleteMany === "function") {
      // @ts-ignore
      await namespace.deleteMany(["persona"]);
    } else {
      // @ts-ignore
      await (index as any).deleteMany({ ids: ["persona"], namespace: ns });
    }
    return NextResponse.json({ ok: true, message: "Persona cleared" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Persona delete failed" }, { status: 500 });
  }
}
