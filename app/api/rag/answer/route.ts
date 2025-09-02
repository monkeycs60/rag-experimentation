import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/services/embedding";
import { getOrCreatePineconeIndex } from "@/lib/services/pinecone";
import { rerankHybrid } from "@/lib/services/rerank";
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

    const reranked = rerankHybrid(query, matches);
    const chosen = reranked.slice(0, contextK);
    const context = buildContext(chosen, contextK);

    // Call OpenAI for grounded answer with citations
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const apiKey = process.env.OPENAI_API_KEY;
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const system = `You are a precise assistant. Answer ONLY using the provided context. If the context is insufficient, say you don't know.
Return valid JSON with: {"answer": string, "citations": [{"source": string, "id": string, "snippet": string}]}.
Citations must reference the provided source and id labels.`;

    const user = `Question: ${query}\n\nContext:\n${context}`;

    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
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

    return NextResponse.json({ ok: true, answer: parsed?.answer, citations: parsed?.citations, used: chosen });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "Answer failed" }, { status: 500 });
  }
}

