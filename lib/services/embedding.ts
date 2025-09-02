const MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

type EmbeddingResponse = {
  data: { embedding: number[] }[];
};

export async function embedTexts(texts: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const endpoint = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const batchSize = Math.max(1, Number(process.env.OPENAI_EMBED_BATCH || 100));
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    const res = await fetch(`${endpoint}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, input: slice }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`OpenAI embeddings error: ${msg}`);
    }
    const json: EmbeddingResponse = (await res.json()) as EmbeddingResponse;
    out.push(...json.data.map((d) => d.embedding));
  }
  return out;
}

export async function embedText(text: string) {
  const [v] = await embedTexts([text]);
  return v;
}
