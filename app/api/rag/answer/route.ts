import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/services/embedding";
import { getOrCreatePineconeIndex, getIndexNamespace } from "@/lib/services/pinecone";
import { rerankHybrid } from "@/lib/services/rerank";
import { getTypedSession } from "@/lib/auth-helpers";
import { RecordMetadata } from "@pinecone-database/pinecone";

export const runtime = "nodejs";

type Match = { id: string; score: number; text?: string; source?: string };

function buildContext(matches: Match[], limit = 5) {
  const trimmed = matches.slice(0, limit).map((m, i) => {
    const text = (m.text || "").slice(0, 700); // keep prompt small
    return `[[${i + 1}]] source: ${m.source ?? "unknown"} id: ${m.id}\n${text}`;
  });
  return trimmed.join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body?.query;
    const topK: number = Number(body?.topK ?? 20);
    const contextK: number = Number(body?.contextK ?? 5);
    const temperature: number = Number(body?.temperature ?? 0.2);
    const detailed: boolean = Boolean(body?.detailed ?? true);
    const saveMemory: boolean = Boolean(body?.saveMemory ?? true);
    if (!query || typeof query !== "string") {
      return NextResponse.json({ ok: false, error: "Missing query" }, { status: 400 });
    }

    const index = await getOrCreatePineconeIndex();
    const vector = await embedText(query);
    const result = await index.query({
      topK,
      vector,
      includeMetadata: true,
    });

    const matches: Match[] = (result.matches || []).map((m) => ({
      id: m.id,
      score: m.score ?? 0,
      text: (m.metadata as RecordMetadata)?.text as string | undefined,
      source: (m.metadata as RecordMetadata)?.source as string | undefined,
    }));

    // Fetch user persona and recent memory from Pinecone namespace
    const session = await getTypedSession();
    const userId = session?.user?.id || "anon";
    const memNs = `mem:${userId}`;
    const namespace = getIndexNamespace(index as any, memNs);
    let personaText = "";
    try {
      const fetched = namespace.fetch
        ? await namespace.fetch(["persona"]) : await (index as any).fetch({ ids: ["persona"], namespace: memNs });
      const m: any = fetched?.records?.persona || fetched?.vectors?.persona;
      personaText = m?.metadata?.text || "";
    } catch {}
    let memMatches: Match[] = [];
    try {
      const memResult = namespace.query
        ? await namespace.query({ topK: 5, vector, includeMetadata: true })
        : await (index as any).query({ topK: 5, vector, includeMetadata: true, namespace: memNs });
      memMatches = (memResult.matches || [])
        .map((m: any) => ({ id: m.id, score: m.score, text: m.metadata?.text, source: m.metadata?.type || "memory" }))
        .filter((m: Match) => !!m.text);
    } catch {}

    const reranked = rerankHybrid(query, matches);
    const chosen = reranked.slice(0, contextK);
    const context = buildContext(chosen, contextK);

    // Call OpenAI for grounded answer with citations
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const apiKey = process.env.OPENAI_API_KEY;
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const system = `You are a precise assistant. Use the user persona to tailor tone and focus. Answer ONLY using the provided context and memory. If insufficient, say you don't know.
Return valid JSON with {"answer": string, "citations": [{"source": string, "id": string, "snippet": string}]}.
Be comprehensive, structured, and cite multiple sources when relevant.`;

    const memSec = memMatches.slice(0, 3).map((m, i) => `[[M${i + 1}]] ${m.text}`).join("\n\n");
    const personaSec = personaText ? `Persona:\n${personaText}\n\n` : "";
    const user = `${personaSec}Question: ${query}\n\nContext:\n${context}\n\nMemory:\n${memSec}`;

    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: detailed ? 900 : 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const msg = await resp.text();
      return NextResponse.json({ ok: false, error: `OpenAI error: ${msg}` }, { status: 500 });
    }
    const data = await resp.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    let parsed: { answer: string; citations: { source: string; id: string; snippet: string }[] } | null = null;
    try {
      parsed = content ? JSON.parse(content) : null;
    } catch {
      parsed = { answer: content ?? "", citations: chosen.map((c) => ({ source: c.source ?? "", id: c.id, snippet: (c.text ?? "").slice(0, 200) })) };
    }

    // Optionally store interaction in memory
    if (saveMemory) {
      try {
        const text = `Q: ${query}\nA: ${typeof parsed?.answer === "string" ? parsed.answer.slice(0, 800) : ""}`;
        const v = await embedText(text);
        const upsert = [{ id: `qa-${Date.now()}`, values: v, metadata: { type: "qa", text } as any }];
        await (namespace.upsert ? namespace.upsert(upsert) : (index as any).upsert(upsert, { namespace: memNs }));
      } catch {}
    }

    return NextResponse.json({ ok: true, answer: parsed?.answer, citations: parsed?.citations, used: chosen, persona: personaText });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "Answer failed" }, { status: 500 });
  }
}
