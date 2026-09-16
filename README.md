# Expenses Tracker

A personal finance tracker for income, expenses, savings and monthly budgets in **Indian Rupees (₹, en-IN)**, with **local AI insights powered by Ollama** and **Google sign-in**. Dark, trading-desk style interface. Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, Auth.js and PostgreSQL. Deploys to Vercel.

Repository: https://github.com/sachin-2004jlr/expenses-tracker

> The application code is the source of truth for every number. The AI only explains figures the app has already calculated. It never does arithmetic and never invents data.

---

## Features

- **Landing page** (`/`) with a bold uppercase hero, product preview built from the real dashboard cards, feature grid and privacy section.
- **Google sign-in** (`/login`) through Auth.js. Optional allow-list so only your Google account can log in. Without OAuth keys the app runs in a zero-config local single-user mode.
- **Dashboard** (`/dashboard`): total balance hero with a day-by-day balance line, saved-this-month panel, recent activity with per-day burn rate, quick-action tiles, bright-green income card with trend, expenses card with trend and daily rate, dotted savings-rate gauge, top category with share slider, monthly spending bars (current month highlighted), category donut, month-over-month comparison and the AI financial summary.
- **Top bar**: month selector pill (previous / next / today, future months allowed), orange add button, global search that jumps to filtered transactions, quick links, account menu with theme switch and sign-out.
- **Add money in seconds**: income / expense toggle, amount auto-focused, category, date, tags and notes, validated on the client and again on the server. Edit, duplicate and confirmed delete on every transaction.
- **Transactions**: full-text search across description, notes, category and tags, type / category / tag / date-range / amount-range filters, sortable columns, pagination; tables become cards on phones.
- **Calendar**: month grid with per-day income and expense totals, week view, day panel, add-on-this-day.
- **Analytics**: income / expense / savings trends, category spending, income sources, largest expenses, averages, best month, month comparison with percentages calculated in application code.
- **Categories, tags, recurring rules** (salary, rent, EMIs, subscriptions post themselves on due dates).
- **AI**: monthly summary, spending analysis and month comparison (structured JSON validated with Zod, graceful fallback), chat assistant whose numerical answers are computed by the app first, insight cache invalidated on data changes, provider abstraction (Ollama local, OpenAI-compatible remote, mock for tests).
- **Settings**: general, categories, recurring, AI (Ollama URL, model detection, test connection, auto-analyse), data (JSON / CSV export, validated import, clear data), appearance (dark by default, light and system available).
- Skeleton loading states, empty states, error boundaries, database-not-configured screen, keyboard-accessible dialogs and menus, labelled icon buttons, reduced-motion support, installable PWA manifest.

## Architecture

```
src/
  app/
    page.tsx                Landing page
    login/                  Google sign-in page
    (app)/                  Signed-in shell: dashboard, transactions, calendar, analytics, assistant, settings
    api/                    Route handlers: auth, transactions, categories, analytics, settings, export, import, ai/*
  components/
    ui/                     shadcn/ui primitives (Base UI)
    layout/                 Icon rail sidebar, top bar, mobile tab bar, app shell
    shared/                 Brand logo, avatar, money formatting, stat cards, dialogs, selectors
  features/
    auth/  dashboard/  transactions/  calendar/  analytics/  ai/  settings/  recurring/
  lib/
    auth.ts                 Auth.js configuration (Google provider, JWT sessions, allow-list)
    db/                     Drizzle schema, client (PGlite locally, Postgres in production), migrations
    money/  dates/          Integer-paise money utilities, timezone-safe date helpers, recurrence
    analytics/              Pure financial calculations (tested) + SQL-backed queries
    validation/             Zod schemas for every input, import files and AI output
    ai/                     AIProvider interface, Ollama / OpenAI-compatible / mock providers, prompts, facts, insights, chat
    services/               Transactions, categories, tags, settings, recurring, export/import, users
    api/                    JSON helpers, error mapping, rate limiting
drizzle/                    Generated SQL migrations
scripts/                    db:migrate and db:seed
e2e/                        Playwright tests
```

**Data flow**: pages are React Server Components that call the service layer directly. Mutations use Server Actions that revalidate the whole app. The same services back the JSON API routes used by the AI endpoints, export/import and external tooling.

**Money**: all amounts are stored and computed as integer **paise** (`₹55,000` = `5500000`).

**Dates**: transactions store a calendar date (`YYYY-MM-DD`). "Today" and "this month" are resolved in the configured time zone (`Asia/Kolkata` by default).

**Users**: every table carries a `user_id` and every service takes a `userId`. `src/lib/services/user.ts` resolves it from the Auth.js session, or from a single local user when sign-in is not configured.

## Authentication

Sign-in uses Auth.js v5 with the Google provider and JWT sessions (no session tables). On sign-in the Google profile is matched to a row in `users` by e-mail, so each Google account gets its own private workspace.

1. Generate a secret: `npx auth secret` (or `openssl rand -base64 32`).
2. In Google Cloud Console create an **OAuth client ID** (Web application) and add the redirect URIs
   `http://localhost:3000/api/auth/callback/google` and `https://<your-domain>/api/auth/callback/google`.
3. Put the values in `.env`:
   ```
   AUTH_SECRET=...
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   AUTH_ALLOWED_EMAILS=you@gmail.com
   ```
4. Restart `npm run dev`. `/dashboard` and the API now require a session; `/login` offers "Continue with Google".

`AUTH_ALLOWED_EMAILS` (comma-separated) is strongly recommended for a personal finance app. Leave the three `AUTH_*` values empty and the app runs in local single-user mode (used by the tests and CI).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| Styling / UI | Tailwind CSS 4, shadcn/ui (Base UI primitives), Lucide icons, Montserrat via `next/font` |
| Charts | Recharts 3 |
| Auth | Auth.js v5 (Google), JWT sessions |
| Database | PostgreSQL (production) / PGlite embedded Postgres (local dev, tests) |
| ORM | Drizzle ORM + Drizzle Kit migrations |
| Validation / forms | Zod 4, React Hook Form |
| AI | Ollama (local) via HTTP; OpenAI-compatible provider; mock provider |
| Testing | Vitest + React Testing Library, Playwright |
| Deployment | Vercel |

## Database

The schema (`src/lib/db/schema.ts`) defines `users`, `categories`, `transactions`, `tags`, `transaction_tags`, `recurring_transactions`, `ai_insights` and `app_settings`.

- **Local development**: leave `DATABASE_URL` empty. An embedded PGlite database is created in `./.data/pglite` and migrations run automatically.
- **Production**: set `DATABASE_URL` to any PostgreSQL connection string (Neon, Supabase, Vercel Postgres, RDS). Migrations run automatically on the first request (`DB_AUTO_MIGRATE=false` disables that) or explicitly with `npm run db:migrate`.

```bash
npm run db:generate   # generate a migration after editing the schema
npm run db:migrate    # apply migrations
npm run db:seed       # default user, categories and settings
npm run db:seed -- --demo   # ...plus demo transactions tagged "demo" (refused in production)
npm run db:studio     # Drizzle Studio
```

## Local setup

Requirements: Node.js 24 (LTS) with npm 11. Node 20.9+ runs the app, but `package-lock.json` is maintained with npm 11; npm 10 (Node 22) may reject the lock file with "Missing: @emnapi/runtime from lock file" because npm 11 omits optional WebAssembly runtime packages.

```bash
git clone git@github-personal:sachin-2004jlr/expenses-tracker.git
cd expenses-tracker
npm install
cp .env.example .env      # optional: defaults work out of the box
npm run dev
```

Open http://localhost:3000 for the landing page and http://localhost:3000/dashboard for the app. Only one `next dev` can run per project folder.

## Ollama setup (local AI)

1. Install Ollama from https://ollama.com and verify with `ollama --version`.
2. `ollama list` shows installed models. Pull one if needed: `ollama pull llama3.2` (or `ollama pull qwen2.5:3b` for faster answers).
3. Start Ollama (desktop app or `ollama serve`); it listens on http://localhost:11434.
4. In **Settings → AI** keep the provider on *Ollama (local)*, click **Test Ollama connection**, pick a model and save.

Installed models are detected through Ollama's `/api/tags`; embedding-only models are ignored. If Ollama is off, the dashboard says "Local AI is unavailable. Start Ollama to enable AI insights." and everything else keeps working.

### Local vs Vercel

```
LOCAL                                  PRODUCTION (Vercel)
Browser → Next.js → Ollama:11434       Browser → Vercel → PostgreSQL
                                                   ↘ optional remote AI provider
```

A Vercel deployment cannot reach the Ollama on your computer; hosted deployments need the OpenAI-compatible provider (or none).

## Environment variables

See `.env.example`. Never commit `.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | empty | PostgreSQL connection string. Empty = local PGlite |
| `DATABASE_SSL` | auto | `disable` for non-TLS hosts |
| `DB_AUTO_MIGRATE` | `true` | Run migrations on first DB access |
| `PGLITE_DATA_DIR` | `./.data/pglite` | Local database location; `memory://` for in-memory |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | empty | Enable Google sign-in (all three required) |
| `AUTH_ALLOWED_EMAILS` | empty | Comma-separated allow-list of Google accounts |
| `AI_PROVIDER` | `ollama` | `ollama` / `openai-compatible` / `mock` |
| `OLLAMA_URL`, `OLLAMA_MODEL` | `http://localhost:11434`, empty | Ollama endpoint and preferred model |
| `OPENAI_COMPATIBLE_*` | empty | Hosted OpenAI-style API |
| `APP_TIMEZONE` | `Asia/Kolkata` | Time zone used to compute "today" |

## Testing

```bash
npm run lint        # ESLint (Next.js + React Compiler rules)
npm run typecheck   # tsc --noEmit
npm test            # Vitest unit + component tests
npm run test:e2e    # Playwright: builds the app and serves it on port 3100 with an in-memory DB and the mock AI
```

## Build

```bash
npm run build
npm start
```

## Vercel deployment

1. Create a PostgreSQL database (Neon, Supabase or Vercel Postgres).
2. Import the GitHub repository in Vercel (framework preset: Next.js).
3. Environment variables: `DATABASE_URL` (required), `APP_TIMEZONE=Asia/Kolkata`, the three `AUTH_*` values plus `AUTH_ALLOWED_EMAILS` for Google sign-in (add the production callback URL in Google Cloud), and optionally `AI_PROVIDER=openai-compatible` with the `OPENAI_COMPATIBLE_*` values.
4. Deploy. Migrations run on the first request.

## Privacy

Your financial data is stored in your configured database. When using local Ollama, AI requests are processed by your local Ollama instance and never leave your machine. Data is only sent to a third-party AI service if you deliberately configure the OpenAI-compatible provider on the server. Google sign-in is used only to identify you; no Google data other than name, e-mail and avatar is stored.

## Known limitations

- PGlite allows a single process per data directory; run one `next dev` at a time locally.
- The PWA manifest makes the app installable, but there is no service worker / offline sync.
- The AI rate limiter is in-memory (per server instance).
- Larger local models (e.g. `llama3.1` 8B) can take minutes per summary on a laptop CPU; choose a smaller model such as `qwen2.5:3b` for faster answers.
- `npm audit` reports a moderate advisory in `esbuild` pulled in transitively by `drizzle-kit`; it affects development tooling only.

## License

Personal project. All rights reserved unless a license file is added.
