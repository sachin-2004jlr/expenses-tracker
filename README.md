# Expenses Tracker

A personal finance tracker for income, expenses, savings and monthly budgets in **Indian Rupees (₹, en-IN)**, with **local AI insights powered by Ollama**. Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM and PostgreSQL. Deploys to Vercel.

Repository: https://github.com/sachin-2004jlr/expenses-tracker

> The application code is the source of truth for every number. The AI only explains figures the app has already calculated. It never does arithmetic and never invents data.

---

## Features

- **Add money in seconds**: prominent *Add transaction* button (desktop header + mobile floating button), Income / Expense toggle, amount auto-focused, category, date, tags and notes. Validated on the client and again on the server.
- **Dashboard**: total balance, this month's income, expenses, savings and savings rate with month-over-month deltas; income vs expense chart (3 / 6 / 12 months / all time); spending-by-category donut (click a slice to filter transactions); recent transactions; month-over-month comparison card.
- **Month selector**: previous / next / today on the dashboard, calendar, analytics and assistant. Future months are allowed.
- **Transactions**: full-text search across description, notes, category and tags ("swiggy" finds "Dinner at Swiggy"), type / category / tag / date-range / amount-range filters, sortable columns, pagination, edit, duplicate and delete (with confirmation). Tables become cards on phones.
- **Calendar**: month grid with per-day income and expense totals, week view, day panel with that day's transactions, add-on-this-day.
- **Analytics**: income / expense / savings trend lines, category spending, income sources, largest expenses, average monthly spend, best month, month comparison with percentages calculated in application code.
- **Categories and tags**: database-backed categories (create, rename, recolour, delete with safe reassignment of existing transactions), free-form tags with filtering.
- **Recurring transactions**: salary, rent, EMIs, subscriptions. Rules are materialised into real transactions on their due dates when you open the app (or via *Run due now*).
- **AI**
  - *AI financial summary* card on the dashboard: monthly summary, spending analysis, month comparison. Structured JSON output validated with Zod; malformed output degrades to plain text and never crashes the app.
  - *AI Assistant* chat with suggested questions. Numerical questions ("how much did I spend on food?") are answered deterministically by the app first; the model only explains the result.
  - Insights are cached per month and invalidated when transactions change (plus a content hash guard), so the model is not called needlessly.
  - Provider abstraction: Ollama (local, default), an OpenAI-compatible HTTP provider for hosted deployments, and a mock provider for tests. Adding OpenAI / Anthropic / Google means implementing one interface.
- **Settings**: general (currency, locale, date format, first day of week, time zone), categories, recurring rules, AI (enable/disable, provider, Ollama URL, model detection, *Test Ollama connection*, auto-analyse), data (export JSON / CSV, validated JSON import with merge or replace, clear data), appearance (light / dark / system).
- **Quality**: skeleton loading states, empty states, error boundaries, a friendly "database not configured" screen, keyboard-accessible dialogs and menus, labelled icon buttons, `prefers-reduced-motion` support, installable PWA manifest.

## Architecture

```
src/
  app/                      Next.js App Router
    (app)/                  Authenticated-style shell: dashboard, transactions, calendar, analytics, assistant, settings
    api/                    Route handlers: transactions, categories, analytics, settings, export, import, ai/*
  components/
    ui/                     shadcn/ui primitives (Base UI)
    layout/                 Sidebar, header, mobile tab bar, app shell
    shared/                 Stat cards, money formatting, empty states, dialogs, month/range selectors
  features/
    dashboard/  transactions/  calendar/  analytics/  ai/  settings/  recurring/
                            Feature UI + server actions
  lib/
    db/                     Drizzle schema, client (PGlite locally, Postgres in production), migrations
    money/                  Integer-paise money utilities (formatCurrency, parseMoney, ...)
    dates/                  Timezone-safe calendar date helpers, recurrence arithmetic
    analytics/              Pure financial calculations (tested) + SQL-backed queries
    validation/             Zod schemas for every input, import files and AI output
    ai/                     AIProvider interface, Ollama / OpenAI-compatible / mock providers, prompts, facts, insights, chat
    services/               Transactions, categories, tags, settings, recurring, export/import, user
    api/                    JSON helpers, error mapping, rate limiting
  types/                    Shared domain types
drizzle/                    Generated SQL migrations
scripts/                    db:migrate and db:seed
e2e/                        Playwright tests
```

**Data flow**: pages are React Server Components that call the service layer directly (no HTTP hop). Mutations use Server Actions that revalidate the whole app so totals, charts, calendar and AI cache stay consistent. The same services are exposed as JSON API routes for the chat/insight endpoints, export/import and external use.

**Money**: all amounts are stored and computed as integer **paise** (`₹55,000` = `5500000`). Floating point is used only for display and for explicitly rounded percentages.

**Dates**: transactions store a calendar date (`YYYY-MM-DD`) with no time component. "Today" and "this month" are resolved in the configured time zone (`Asia/Kolkata` by default), so a server running in UTC never shifts your data.

**Authentication**: not included in v1 (it is a personal app). Every table carries a `user_id` and every service takes a `userId`; a single default user is created on first run. Adding auth means resolving the user from a session in `src/lib/services/user.ts`; nothing else changes.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| Styling / UI | Tailwind CSS 4, shadcn/ui (Base UI primitives), Lucide icons |
| Charts | Recharts 3 |
| Database | PostgreSQL (production) / PGlite embedded Postgres (local dev, tests) |
| ORM | Drizzle ORM + Drizzle Kit migrations |
| Validation / forms | Zod 4, React Hook Form |
| Dates | date-fns + custom timezone-safe helpers |
| AI | Ollama (local) via HTTP; OpenAI-compatible provider; mock provider |
| Testing | Vitest + React Testing Library, Playwright |
| Deployment | Vercel |

## Database

The schema (`src/lib/db/schema.ts`) defines `users`, `categories`, `transactions`, `tags`, `transaction_tags`, `recurring_transactions`, `ai_insights` and `app_settings`.

- **Local development**: leave `DATABASE_URL` empty. An embedded PGlite database is created in `./.data/pglite` and migrations run automatically on first access. No install required.
- **Production**: set `DATABASE_URL` to any PostgreSQL connection string (Neon, Supabase, Vercel Postgres, RDS, Docker). Migrations run automatically on the first request (`DB_AUTO_MIGRATE=false` disables that) or explicitly with `npm run db:migrate`.

Useful scripts:

```bash
npm run db:generate   # generate a new migration after editing the schema
npm run db:migrate    # apply migrations to DATABASE_URL (or the local PGlite DB)
npm run db:seed       # create the default user, categories and settings
npm run db:seed -- --demo   # ...plus clearly-tagged demo transactions (refused in production)
npm run db:studio     # Drizzle Studio
```

## Screenshots

_Placeholders: add screenshots of the dashboard, transactions, calendar, analytics and the AI assistant here._

## Local setup

Requirements: Node.js 20.9+ (tested on Node 24), npm.

```bash
git clone git@github-personal:sachin-2004jlr/expenses-tracker.git
cd expenses-tracker
npm install
cp .env.example .env      # optional: defaults work out of the box
npm run dev
```

Open http://localhost:3000. The first request creates the local database, the default user, the default categories and settings.

## Ollama setup (local AI)

1. Install Ollama from https://ollama.com.
2. Verify the install:
   ```bash
   ollama --version
   ```
3. See which models you already have:
   ```bash
   ollama list
   ```
4. If no chat model is installed, pull one (any general chat model works; smaller models answer faster):
   ```bash
   ollama pull llama3.2
   # or: ollama pull qwen2.5:3b
   ```
5. Start Ollama (the desktop app starts it automatically; otherwise run `ollama serve`). It listens on http://localhost:11434.
6. In the app open **Settings → AI**, keep the provider on *Ollama (local)*, click **Test Ollama connection**, pick a model from the detected list (or leave *Auto-select*) and save.

The app auto-detects installed models through Ollama's `/api/tags` endpoint and prefers `llama` → `qwen` → `gemma` → `mistral` families when auto-selecting. Embedding-only models (e.g. `nomic-embed-text`) are ignored.

If Ollama is not running, the dashboard shows *"Local AI is unavailable. Start Ollama to enable AI insights."* and every non-AI feature keeps working.

## AI configuration

| Setting | Where | Notes |
| --- | --- | --- |
| Enable AI | Settings → AI | Turns the summary card and assistant off entirely |
| Provider | Settings → AI | `ollama` (default), `openai-compatible`, `mock` |
| Ollama URL / model | Settings → AI | Defaults from `OLLAMA_URL` / `OLLAMA_MODEL` when the settings row is first created |
| Auto-analyse | Settings → AI | Off by default to avoid unnecessary model calls |
| OpenAI-compatible endpoint | Server env only | `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_MODEL` |

`AI_PROVIDER=mock` in the environment forces the deterministic mock provider (used by the test suite and CI).

### Local vs Vercel

```
LOCAL                                  PRODUCTION (Vercel)
Browser → Next.js → Ollama:11434       Browser → Vercel → PostgreSQL
                                                   ↘ optional remote AI provider
```

A Vercel deployment **cannot reach the Ollama on your computer**. Hosted deployments need the OpenAI-compatible provider (or none). Nothing financial depends on AI.

## Environment variables

See `.env.example`. Never commit `.env`; secrets stay server-side and nothing sensitive is exposed through `NEXT_PUBLIC_*`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | empty | PostgreSQL connection string. Empty = local PGlite |
| `DATABASE_SSL` | auto | Set `disable` for non-TLS hosts (Docker). TLS is used for any non-localhost host |
| `DB_AUTO_MIGRATE` | `true` | Run migrations on first DB access |
| `PGLITE_DATA_DIR` | `./.data/pglite` | Local database location; `memory://` for in-memory |
| `AI_PROVIDER` | `ollama` | `ollama` / `openai-compatible` / `mock` |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama endpoint |
| `OLLAMA_MODEL` | empty | Preferred model; empty = auto-select |
| `OPENAI_COMPATIBLE_*` | empty | Base URL, API key and model for a hosted OpenAI-style API |
| `APP_TIMEZONE` | `Asia/Kolkata` | Time zone used to compute "today" |

## Testing

```bash
npm run lint        # ESLint (Next.js + React Compiler rules)
npm run typecheck   # tsc --noEmit
npm test            # Vitest unit + component tests
npm run test:e2e    # Playwright (starts its own server with an in-memory DB and the mock AI)
```

Unit tests cover balance, monthly income / expenses, savings and savings rate (including zero income), category breakdown, monthly comparison, date filtering, largest expenses, January / December boundaries, leap years, large INR amounts, negative balances, money parsing and formatting, recurrence arithmetic, backup validation and malformed AI output handling.

## Build

```bash
npm run build
npm start
```

## Vercel deployment

1. Create a PostgreSQL database (Neon, Supabase or Vercel Postgres) and copy its connection string.
2. Import the GitHub repository in Vercel (framework preset: Next.js; no extra configuration is needed, so there is no `vercel.json`).
3. Add environment variables in *Project → Settings → Environment Variables*:
   - `DATABASE_URL` (required)
   - `APP_TIMEZONE=Asia/Kolkata`
   - optionally `AI_PROVIDER=openai-compatible` plus the `OPENAI_COMPATIBLE_*` values if you want AI in the hosted app
4. Deploy. Migrations run automatically on the first request. The expected URL is `https://expenses-tracker-<hash>.vercel.app` (or `https://expenses-tracker.vercel.app` if the project name is available).

Without `DATABASE_URL` the hosted app shows a setup screen explaining what to configure instead of a blank page.

## Privacy

Your financial data is stored in your configured database. When using local Ollama, AI requests are processed by your local Ollama instance and never leave your machine. Data is only sent to a third-party AI service if you deliberately configure the OpenAI-compatible provider on the server.

## Known limitations

- No authentication in v1: the app is single-user. The schema and services are user-scoped, so auth can be added without a rewrite.
- PGlite allows a single process per data directory; run one `next dev` at a time locally (or point a second instance at another `PGLITE_DATA_DIR`).
- The PWA manifest makes the app installable, but there is no service worker / offline sync; the app needs a connection to the database.
- The AI rate limiter is in-memory (per server instance). Use Redis/Upstash if you deploy multiple instances behind a public URL.
- Larger local models (e.g. `llama3.1` 8B) can take minutes per summary on a laptop CPU; choose a smaller model such as `qwen2.5:3b` for faster answers.
- `npm audit` reports a moderate advisory in `esbuild` pulled in transitively by `drizzle-kit`. It affects the development-only migration tooling, not the deployed application.

## License

Personal project. All rights reserved unless a license file is added.
