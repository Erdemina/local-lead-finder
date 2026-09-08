# Local Lead Finder — architecture notes

Notes for anyone (human or agent) working on this codebase. Everything here was
verified by measurement, not guessed.

**Stack:** Next.js 14.2 (App Router, standalone output) · TypeScript strict ·
Tailwind + shadcn/Radix · Prisma 6 (PostgreSQL) · BullMQ/Redis ·
Docker (node:20-alpine, multi-stage).

## Running

```bash
docker compose up -d          # http://localhost:3000
docker compose logs -f
docker compose build          # after code changes
```

Without Docker: `yarn install && yarn dev`, plus `yarn worker` in a second shell.

## Traps worth knowing

- **The Docker `WORKDIR` must never be `/app`** (it is `/srv/web`). The App
  Router root is `<workdir>/app`, and the repo also has `app/app/` for the
  `/app` URL segment. With `WORKDIR /app` those collide at `/app/app` and Next
  compiles `app/app/<route>` as `/<route>`, clobbering `/login` and `/`. It is
  **invisible locally** (the project folder isn't named `app`) — `tsc`,
  `next build` and the tests all pass; only the container breaks. Symptom:
  even `/nonexistent` returns `307 → /login`.
- **`outputFileTracingRoot` must be the project root (`__dirname`).** Passing
  `'../'` makes the tracing root `/` and nests the standalone output pointlessly.

## Data layer

- **Tenant guard:** `lib/db.ts` wraps Prisma so that queries against
  tenant-scoped models without a `tenantId` throw in dev/test. Deliberate
  cross-workspace access (admin/system code) must use `prismaUnscoped`.
- **Migrations can be written by hand** with the DB down:
  `prisma/migrations/<timestamp>_<name>/migration.sql`, then `prisma generate`.

## AI layer

- `lib/ai/provider.ts` — Anthropic (official SDK, server-side web-search tool) or
  OpenRouter. Structured output comes from a `strict:true` custom tool.
- **OpenRouter's web search is a plugin, not a tool** — it injects results into
  the prompt. Using `plugins:[{id:'web'}]` together with `tool_choice` in one
  turn makes the model answer *before* it can read the search results, returning
  an empty list (measured). So the OpenRouter path is two-step: (1) plugin on,
  no forced tool → free-text research; (2) feed that research back and force the
  tool → structured output. The Anthropic path has a real tool loop, so one step
  is enough.
- **Verify OpenRouter model ids against `/api/v1/models`** — `-latest` aliases
  are invalid and return 400/404.
- **Client components must not import `lib/ai/provider.ts`** (it pulls in Prisma
  and the Anthropic SDK); shared types live in `lib/ai/config.ts`.
- **AI scoring never blocks a search:** `applyAiScores` has its own try/catch; if
  it fails, scores stay null and the user is told via the progress message.

## Overpass (map service) traps — all measured

- **The `(around:…)` filter must come first.** `nwr["shop"="x"]["name"](around:…)`
  scans tags planet-wide and times out at 30s (0 results);
  `nwr(around:…)["shop"="x"]` returns the same data in ~1s.
- **Never add a `["name"]` existence filter** — it triggers that timeout and is
  redundant: unnamed records are dropped in `toProspect()` anyway.
- **Overpass reports query timeouts as HTTP 200 with a `remark` field.** Checking
  `res.ok` is not enough; unread, the error looks like "0 results".
- **Name regexes (`["name"~"…",i]`) are unusable** — every one of the 6 mirrors
  tested times out even with a bounded area. Free text is therefore mapped to
  curated categories by `matchOsmCategories()` (synonyms included).
- **Mirrors:** `overpass-api.de` (primary) and `maps.mail.ru` work;
  `kumi.systems` / `private.coffee` do not respond; `osm.ch` is regional (no TR).
- **Transient errors are common:** 504/429 and momentary network failures are
  normal. The adapter retries 3 rounds across all endpoints, and a network error
  must also count as transient (if it throws, the fallback is skipped).

## Excel round-trip

`lib/excel/leads-workbook.ts` is the single source for the column definition,
used by both export and import. Generated server-side with `exceljs` — data
validation (dropdowns) and cell locking are not possible with `xlsx`. Import is
two-step: `/api/leads/import` (preview, writes nothing) → `/api/leads/import/apply`.

Tests: `yarn vitest run`.
