"use client";
import { useState } from "react";

export default function RagPage() {
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; score: number; text?: string; source?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function runIndex() {
    setIndexing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/index", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed");
      setStatus(data.message || "Indexing complete");
    } catch (e: any) {
      setStatus(e?.message || "Indexing failed");
    } finally {
      setIndexing(false);
    }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.matches || []);
    } catch (e: any) {
      setStatus(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">PDF RAG</h1>
      <p className="text-sm text-gray-600">Index local PDFs from <code>/pdf</code> and semantically search them via Pinecone.</p>

      <div className="flex items-center gap-3">
        <button
          onClick={runIndex}
          disabled={indexing}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {indexing ? "Indexing…" : "Index PDFs"}
        </button>
        {status && <span className="text-sm">{status}</span>}
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your PDFs…"
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={runSearch} disabled={loading} className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50">
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.id} className="border rounded p-3">
            <div className="text-xs text-gray-500">{r.source} — score: {r.score?.toFixed(3)}</div>
            <div className="whitespace-pre-wrap text-sm mt-1">{r.text}</div>
          </div>
        ))}
        {!loading && results.length === 0 && (
          <div className="text-sm text-gray-500">No results yet. Try a search.</div>
        )}
      </div>
    </div>
  );
}

