## Unreleased

- RAG page refactor: server-first data fetching and client subcomponent
  - Moved `persona` and `recent memories` fetching to the server in `app/[locale]/rag/page.tsx` using new service helpers (`lib/services/rag.ts`).
  - Added `RagClient` interactive client component to handle actions (index, search, answer, stats, persona save) without `useEffect` for initial loads.
  - Implemented skeleton loaders (shadcn/ui) for results, answers, stats, and memory refresh to improve perceived performance.
  - Switched inputs/buttons to shadcn/ui components for consistency.
  - Kept API routes for mutations; no behavioral changes to endpoints.

