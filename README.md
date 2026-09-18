# Local Lead Finder

**English** · [Türkçe](README.tr.md)

Find local businesses that have no website — or a broken one — and turn them into
a working sales pipeline. Search OpenStreetMap by category and area, check every
result's website health, optionally score and annotate results with an LLM, then
manage the survivors as leads with notes, stages, Excel round-trip and generated
demo sites.

Built for agencies and freelancers who sell websites and digital services to
local businesses. Self-hosted, no billing, no plan limits, no external SaaS.

## Features

- 🗺️ **Category + area search** — OpenStreetMap Overpass, no API key required
- 🩺 **Website health check** — classifies every result as healthy, broken, parked or missing
- 🤖 **AI search & scoring** *(optional)* — Anthropic Claude or OpenRouter, with web search, to discover businesses Overpass does not list and to score how promising each one is
- 🇹🇷 **Nationwide sweep** — queue one background sweep per province and export the whole batch as a single workbook
- 👥 **Lead pipeline** — stages, notes, contact fields, bulk actions
- 📊 **Excel round-trip** — export with dropdowns and locked cells, edit offline, import back with a preview step before anything is written
- 🌐 **Demo site generation** — produce a template-based demo site for a lead, served over its own slug
- 🔐 **Users & workspaces** — super admin plus per-workspace owners and members
- 🗄️ **KVKK/GDPR retention** — per-workspace retention window, expired leads purged automatically

## Architecture

```
                       ┌─────────────────────────┐
   Browser ──:3000───▶ │  Next.js 14 (App Router)│
                       │  server components +    │
                       │  route handlers         │
                       └───────────┬─────────────┘
                                   │ enqueue (BullMQ)
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
       ┌────────────┐       ┌────────────┐    ┌──────────────────────┐
       │ PostgreSQL │       │   Redis    │◀──▶│  Worker              │
       │   :5432    │       │   :6379    │    │  sweeps, site gen,   │
       └────────────┘       └────────────┘    │  health, retention   │
                                              └──────────┬───────────┘
                                                         │ writes
                                                         ▼
                                              ┌──────────────────────┐
   Browser ──:8080──────────────────────────▶ │ nginx (demo sites)   │
                                              └──────────────────────┘
```

External services: **Overpass** (business data), **Nominatim** (geocoding), and
optionally **Anthropic** or **OpenRouter** for AI search and scoring.

### Layout

```
local-lead-finder/
├── app/
│   ├── app/          # tenant-facing screens (search, sweep, leads, actions, settings)
│   ├── admin/        # super-admin screens (workspaces, data sources, sites, audit)
│   ├── api/          # route handlers
│   └── _components/  # feature components
├── lib/
│   ├── discovery/    # source adapters (Overpass, AI search) + search engine
│   ├── ai/           # provider abstraction (Anthropic / OpenRouter)
│   ├── health/       # website health checker
│   ├── excel/        # workbook definition shared by export and import
│   └── queue/        # BullMQ queues and job types
├── worker/           # background job processors
├── prisma/           # schema + migrations
└── scripts/          # seed
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+ and Compose v2
- For local development without Docker: Node.js 20+, Yarn, a PostgreSQL 16 and a Redis instance

## Setup

```bash
cp .env.example .env      # fill in the secrets — see the table below
docker compose up --build
```

Migrations run automatically before the app starts. Seed the data sources and
the first admin account:

```bash
docker compose exec worker node_modules/.bin/tsx scripts/seed.ts
```

The app is then on <http://localhost:3000> and generated demo sites on
<http://localhost:8080>. Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

### Local development

```bash
yarn install
yarn prisma migrate deploy
yarn dev
yarn worker        # in a second shell — background jobs
```

## Environment variables

| Variable | Required | What it is | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string | Your own Postgres; compose builds it from the `POSTGRES_*` values |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | yes | Credentials for the bundled Postgres container | Choose your own |
| `REDIS_URL` | yes | Redis connection string for the job queue | Bundled container: `redis://redis:6379` |
| `NEXTAUTH_URL` | yes | Public base URL of the app | e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | yes | Session signing secret | `openssl rand -base64 32` |
| `SECRETS_MASTER_KEY` | yes | AES-256-GCM key encrypting provider API keys at rest | `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` | yes | First super-admin account, created and re-synced by the seed | Choose your own |
| `ADMIN_NAME` | no | Display name for that account | Defaults to `Admin` |
| `APP_PORT` | no | Host port the app is published on | Defaults to `3000` |
| `SITES_OUTPUT_DIR` | yes | Where the worker writes generated demo sites (container path) | Defaults to `/data/websites` |
| `SITES_HOST_DIR` | no | Host directory bind-mounted for those sites | Defaults to `./data/websites` |
| `PUBLIC_SITES_BASE_URL` | yes | Public base URL the generated sites are served from | e.g. `http://localhost:8080` |
| `NOMINATIM_USER_AGENT` | yes | Identifying User-Agent with contact info | Required by the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) |
| `ANTHROPIC_API_KEY` | no | Local-dev fallback for AI search/scoring | <https://console.anthropic.com> |
| `OPENROUTER_API_KEY` | no | Local-dev fallback, alternative provider | <https://openrouter.ai/keys> |

In normal use the AI keys are **not** kept in `.env`. Enter them under
**Admin › Data Sources**, where they are encrypted with `SECRETS_MASTER_KEY`
before being written to the database and are never shown again.

## Data sources and their terms

Overpass and Nominatim are free and key-less, but both have usage policies that
this project respects (1 request/sec, identifying User-Agent). If you run large
sweeps, consider hosting your own Overpass instance. AI-discovered results come
from a language model and **must be verified** before you contact anyone.

## Tests

```bash
yarn vitest run
```

## License

[MIT](LICENSE)
