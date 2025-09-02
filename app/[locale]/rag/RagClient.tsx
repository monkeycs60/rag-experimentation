"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecordMetadata } from "@pinecone-database/pinecone";

type SearchMatch = { id: string; score: number; text?: string; source?: string };
type Citation = { source?: string; id?: string; snippet?: string };
type RecentItem = { id: string; text: string };

export function RagClient({ initialPersona, initialRecent }: { initialPersona: string; initialRecent: RecentItem[] }) {
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [clearing, setClearing] = useState(false);
  const [stats, setStats] = useState<RecordMetadata | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [persona, setPersona] = useState(initialPersona);
  const [savingPersona, setSavingPersona] = useState(false);
  const [saveMemory, setSaveMemory] = useState(true);
  const [detailed, setDetailed] = useState(true);
  const [recent, setRecent] = useState<RecentItem[]>(initialRecent);
  const [refreshingMemory, setRefreshingMemory] = useState(false);

  async function reloadPersona() {
    try {
      const r = await fetch("/api/rag/memory/persona");
      const d = await r.json();
      if (r.ok && d.ok) setPersona(d.persona || "");
    } catch {}
  }

  async function reloadRecent() {
    try {
      const r2 = await fetch("/api/rag/memory/recent");
      const d2 = await r2.json();
      if (r2.ok && d2.ok) setRecent(d2.items || []);
    } catch {}
  }

  async function refreshMemory() {
    setRefreshingMemory(true);
    await Promise.all([reloadPersona(), reloadRecent()]);
    setRefreshingMemory(false);
  }

  async function runIndex() {
    setIndexing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/index", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed");
      setStatus(data.message || "Indexing complete");
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Indexing failed");
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
      setStatus(e instanceof Error ? e.message : "Search failed");
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
      if (saveMemory) reloadRecent();
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Answer failed");
    } finally {
      setAnswering(false);
    }
  }

  async function savePersonaText() {
    setStatus(null);
    if (!persona.trim()) {
      try {
        const res = await fetch("/api/rag/memory/persona", { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed");
        setStatus("Persona cleared");
        setPersona("");
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : "Delete failed");
      }
      return;
    }
    setSavingPersona(true);
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
      setStatus(e instanceof Error ? e.message : "Save failed");
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
      setStatus(e instanceof Error ? e.message : "Clear failed");
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
      setStatus(e instanceof Error ? e.message : "Stats failed");
    } finally {
      setLoadingStats(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button onClick={runIndex} disabled={indexing}>
          {indexing ? "Indexing…" : "Index PDFs"}
        </Button>
        <Button onClick={runClear} disabled={clearing} variant="destructive">
          {clearing ? "Clearing…" : "Clear Index"}
        </Button>
        <Button onClick={runStats} disabled={loadingStats} variant="secondary">
          {loadingStats ? "Loading…" : "Stats"}
        </Button>
        {status && <span className="text-sm">{status}</span>}
      </div>

      <div className="space-y-2 border rounded p-3 bg-white">
        <div className="text-sm font-medium flex items-center justify-between">
          <span>Persona (facultatif)</span>
          <Button onClick={refreshMemory} variant="outline" size="sm">
            {refreshingMemory ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <Textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="Décrivez votre rôle, objectifs, ton préféré… (laisser vide puis Save pour effacer)"
          className="h-24"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={savePersonaText} disabled={savingPersona}>
            {savingPersona ? "Saving…" : "Save Persona"}
          </Button>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={saveMemory} onChange={(e) => setSaveMemory(e.target.checked)} />
            Save Q/A to memory
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} />
            Detailed answer
          </label>
        </div>
        {recent.length > 0 ? (
          <div className="text-xs text-gray-700">
            <div className="font-medium mb-1">3 derniers souvenirs</div>
            <ul className="list-disc pl-5 space-y-1">
              {recent.map((r) => (
                <li key={r.id} className="whitespace-pre-wrap">{r.text}</li>
              ))}
            </ul>
          </div>
        ) : refreshingMemory ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your PDFs…"
        />
        <Button onClick={runSearch} disabled={loading} variant="secondary">
          {loading ? "Searching…" : "Search"}
        </Button>
        <Button onClick={runAnswer} disabled={answering}>
          {answering ? "Answering…" : "Answer"}
        </Button>
      </div>

      {answering ? (
        <div className="border rounded p-4 space-y-2 bg-gray-50">
          <div className="font-medium">Answer</div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ) : answer ? (
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
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="border rounded p-3 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </>
        ) : (
          <>
            {results.map((r) => (
              <div key={r.id} className="border rounded p-3">
                <div className="text-xs text-gray-500">{r.source} — score: {r.score?.toFixed(3)}</div>
                <div className="whitespace-pre-wrap text-sm mt-1">{r.text}</div>
              </div>
            ))}
            {results.length === 0 && (
              <div className="text-sm text-gray-500">No results yet. Try a search.</div>
            )}
          </>
        )}
      </div>

      {loadingStats ? (
        <div className="border rounded p-4 bg-white space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : stats ? (
        <div className="border rounded p-4 bg-white">
          <div className="text-sm font-medium mb-2">Index stats</div>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(stats, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}

