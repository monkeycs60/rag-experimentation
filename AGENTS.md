# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router; localized routes in `app/[locale]/`.
- `components/`: UI generic components (`components/ui/`).
- `lib/`: server actions, auth, schemas, services, utils (e.g., `lib/actions/`, `lib/prisma.ts`).
- `prisma/`: schema and migrations; client generated to `app/generated/prisma/`.
- `messages/`: i18n dictionaries (en, fr).  
- `tests/e2e/`: Playwright tests.  
- `public/`, `pdf/`: static assets and sample PDFs.

## Build, Test, and Development Commands
- `npm run dev`: Start dev server with Turbopack on `localhost:3000`.
- `npm run build`: Production build (`.next`).
- `npm run start`: Run the built app.
- `npm run lint`: ESLint checks.
- `npm run test:e2e`: Run Playwright E2E.
- `npm run test:e2e:ui`: Playwright with UI runner.
- Postinstall: `prisma migrate deploy && prisma generate` (ensure DB reachable on deploy).

## Coding Style & Naming Conventions
- TypeScript strict: no `any`; prefer inferred + explicit types.
- Server-first: use server components/actions; avoid `useEffect` for data fetching.
- UI: shadcn/ui, Tailwind v4 utilities; keep components small and composable.
- Naming: `PascalCase` for components, `camelCase` for functions/vars, route folders `kebab-case`.
- i18n: all user-visible text via `next-intl` messages.
- Linting: ESLint (Next config). Keep imports ordered; remove dead code.

## Testing Guidelines
- Framework: Playwright (`tests/e2e/*.spec.ts`).
- Selectors: prefer role- and label-based queries (`getByRole`, `getByText`).
- Scope: add/maintain E2E for auth, RAG flows, and critical navigation.
- Run locally: `npm run test:e2e` or `npm run test:e2e:ui` for debugging.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:` (e.g., `feat: implement rag search`).
- PRs: clear description, linked issues, screenshots/GIFs for UI, test plan, and i18n notes.
- Keep PRs focused; update tests and messages when behavior changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; set `DATABASE_URL`, `SHADOW_DATABASE_URL`, `BETTER_AUTH_SECRET`, optional OAuth (`GOOGLE_*`), AI keys, and MCP keys.
- Do not commit secrets; never expose keys in client code.
- DB: run `npx prisma migrate dev && npx prisma generate` locally before `dev`.
- MCP/AI: run `./setup-mcp.sh` if using Claude Code agents.
