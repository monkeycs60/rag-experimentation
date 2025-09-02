export type Candidate = {
  id: string;
  text: string;
  source?: string;
  score?: number; // original vector score
};

const STOPWORDS = new Set(
  [
    "a","an","the","and","or","but","if","then","else","when","at","by","for","in","of","on","to","up","with","as","is","are","was","were","be","been","being","from","that","this","these","those","it","its","into","about","over","after","before","between","while","can","could","should","would","may","might","do","does","did"
  ]
);

function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function lexicalScore(query: string, text: string) {
  const q = new Set(tokenize(query));
  const d = new Set(tokenize(text));
  if (q.size === 0 || d.size === 0) return 0;
  let inter = 0;
  for (const t of q) if (d.has(t)) inter++;
  // Cosine on binary vectors
  return inter / Math.sqrt(q.size * d.size);
}

export function rerankHybrid(
  query: string,
  candidates: Candidate[],
  opts: { alpha?: number } = {}
) {
  const alpha = opts.alpha ?? 0.6; // weight for vector score
  const scores = candidates.map((c) => c.score ?? 0);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 1);
  const denom = max - min || 1;
  return [...candidates]
    .map((c) => {
      const vec = ((c.score ?? 0) - min) / denom;
      const lex = lexicalScore(query, c.text);
      const final = alpha * vec + (1 - alpha) * lex;
      return { ...c, _lex: lex, _vec: vec, _final: final } as Candidate & {
        _lex: number; _vec: number; _final: number;
      };
    })
    .sort((a, b) => b._final - a._final)
    .map(({ _lex, _vec, _final, ...rest }) => rest);
}

