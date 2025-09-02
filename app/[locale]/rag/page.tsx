"use client";
import { RecordMetadata } from "@pinecone-database/pinecone";
import { useState } from "react";

export default function RagPage() {
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; score: number; text?: string; source?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<{ source?: string; id?: string; snippet?: string }[]>([]);
  const [clearing, setClearing] = useState(false);
  const [stats, setStats] = useState<RecordMetadata | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [persona, setPersona] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);
  const [saveMemory, setSaveMemory] = useState(true);
  const [detailed, setDetailed] = useState(true);

  async function runIndex() {
    setIndexing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/index", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed");
      setStatus(data.message || "Indexing complete");
    } catch (e: unknown) { 
      if (e instanceof Error) {
        setStatus(e.message);
      } else {
        setStatus("Indexing failed");
      }
    } finally {
      setIndexing(false);
    }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setAnswer(null);
    setCitations([]);
    try {
      const res = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.matches || []);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setStatus(e.message);
      } else {
        setStatus("Search failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function runAnswer() {
    if (!query.trim()) return;
    setAnswering(true);
    setAnswer(null);
    setCitations([]);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, saveMemory, detailed }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Answer failed");
      setAnswer(data.answer || null);
      setCitations(Array.isArray(data.citations) ? data.citations : []);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setStatus(e.message);
      } else {
        setStatus("Answer failed");
      }
    } finally {
      setAnswering(false);
    }
  }
  async function savePersonaText() {
    if (!persona.trim()) return;
    setSavingPersona(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/memory/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
      setStatus("Persona saved");
    } catch (e: unknown) {
      if (e instanceof Error) setStatus(e.message); else setStatus("Save failed");
    } finally {
      setSavingPersona(false);
    }
  }

  async function runClear() {
    setClearing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/clear", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Clear failed");
      setStatus(data.message || "Index cleared");
      setResults([]);
      setAnswer(null);
      setCitations([]);
      setStats(null);
    } catch (e: unknown) {
      if (e instanceof Error) setStatus(e.message); else setStatus("Clear failed");
    } finally {
      setClearing(false);
    }
  }

  async function runStats() {
    setLoadingStats(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/stats");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Stats failed");
      setStats(data.description || data);
    } catch (e: unknown) {
      if (e instanceof Error) setStatus(e.message); else setStatus("Stats failed");
    } finally {
      setLoadingStats(false);
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
        <button
          onClick={runClear}
          disabled={clearing}
          className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
        >
          {clearing ? "Clearing…" : "Clear Index"}
        </button>
        <button
          onClick={runStats}
          disabled={loadingStats}
          className="px-4 py-2 rounded bg-gray-200 text-gray-900 disabled:opacity-50"
        >
          {loadingStats ? "Loading…" : "Stats"}
        </button>
        {status && <span className="text-sm">{status}</span>}
      </div>

      <div className="space-y-2 border rounded p-3 bg-white">
        <div className="text-sm font-medium">Persona (facultatif)</div>
        <textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="Décrivez votre rôle, objectifs, ton préféré…"
          className="w-full border rounded px-3 py-2 text-sm h-24"
        />
        <div className="flex items-center gap-2">
          <button onClick={savePersonaText} disabled={savingPersona} className="px-3 py-2 rounded bg-gray-900 text-white disabled:opacity-50">
            {savingPersona ? "Saving…" : "Save Persona"}
          </button>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={saveMemory} onChange={(e) => setSaveMemory(e.target.checked)} />
            Save Q/A to memory
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} />
            Detailed answer
          </label>
        </div>
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
        <button onClick={runAnswer} disabled={answering} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
          {answering ? "Answering…" : "Answer"}
        </button>
      </div>

      {answer && (
        <div className="border rounded p-4 space-y-2 bg-gray-50">
          <div className="font-medium">Answer</div>
          <div className="text-sm whitespace-pre-wrap">{answer}</div>
          {citations.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-medium text-gray-600 mb-1">Citations</div>
              <ul className="list-disc pl-5 space-y-1">
                {citations.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700">
                    <span className="font-mono">{c.source ?? 'unknown'}</span> — <span className="font-mono">{c.id ?? ''}</span>
                    {c.snippet ? <span>: {c.snippet}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

      {stats && (
        <div className="border rounded p-4 bg-white">
          <div className="text-sm font-medium mb-2">Index stats</div>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(stats, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
