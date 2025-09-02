const MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

type EmbeddingResponse = {
  data: { embedding: number[] }[];
};

export async function embedTexts(texts: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`OpenAI embeddings error: ${msg}`);
  }
  const json: EmbeddingResponse = await res.json();
  return json.data.map((d) => d.embedding);
}

export async function embedText(text: string) {
  const [v] = await embedTexts([text]);
  return v;
}
