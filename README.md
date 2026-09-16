# Expenses Tracker

A personal finance tracker for income, expenses, savings and monthly budgets in **Indian Rupees (₹, en-IN)**, with **local AI insights powered by Ollama** and **e-mail + password accounts**. Dark, trading-desk style interface. Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Auth.js and MongoDB. Deploys to Vercel.

Repository: https://github.com/sachin-2004jlr/expenses-tracker

> The application code is the source of truth for every number. The AI only explains figures the app has already calculated. It never does arithmetic and never invents data.

---

## Features

- **Landing page** (`/`) with a bold uppercase hero, product preview built from the real dashboard cards, feature grid and privacy section.
- **Accounts** (`/register`, `/login`) with e-mail and password: scrypt-hashed passwords, encrypted session cookies, optional allow-list of e-mail addresses, name and password changes in Settings → Account.
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
    login/  register/       Sign-in and account creation pages
    (app)/                  Signed-in shell: dashboard, transactions, calendar, analytics, assistant, settings
    api/                    Route handlers: auth, transactions, categories, analytics, settings, export, import, ai/*
  components/
    ui/                     shadcn/ui primitives (Base UI)
    layout/                 Icon rail sidebar, top bar, mobile tab bar, app shell
    shared/                 Brand logo, avatar, money formatting, stat cards, dialogs, selectors
  features/
    auth/  dashboard/  transactions/  calendar/  analytics/  ai/  settings/  recurring/
  lib/
    auth.ts  password.ts    Auth.js configuration (credentials provider, JWT sessions, allow-list), scrypt hashing
    db/                     MongoDB document types, client (local MongoDB or Atlas), index setup
    money/  dates/          Integer-paise money utilities, timezone-safe date helpers, recurrence
    analytics/              Pure financial calculations (tested) + MongoDB aggregation queries
    validation/             Zod schemas for every input, import files and AI output
    ai/                     AIProvider interface, Ollama / OpenAI-compatible / mock providers, prompts, facts, insights, chat
    services/               Transactions, categories, tags, settings, recurring, export/import, users
    api/                    JSON helpers, error mapping, rate limiting
scripts/                    db:migrate and db:seed
e2e/                        Playwright tests
```

**Data flow**: pages are React Server Components that call the service layer directly. Mutations use Server Actions that revalidate the whole app. The same services back the JSON API routes used by the AI endpoints, export/import and external tooling.

**Money**: all amounts are stored and computed as integer **paise** (`₹55,000` = `5500000`).

**Dates**: transactions store a calendar date (`YYYY-MM-DD`). "Today" and "this month" are resolved in the configured time zone (`Asia/Kolkata` by default).

**Users**: every document carries a `userId` and every service takes a `userId`. `src/lib/services/user.ts` resolves it from the Auth.js session; unauthenticated requests get a 401 (API) or a redirect to `/login` (pages).

## Authentication

Accounts are e-mail + password, handled by Auth.js v5 with a credentials provider:

- Passwords are hashed with Node's built-in **scrypt** (random salt, timing-safe compare) and stored in the `users` collection as `passwordHash`; nothing is ever stored in plain text.
- Sessions are JWTs in an encrypted, HttpOnly cookie signed with `AUTH_SECRET` (30-day expiry). No session tables.
- `/register` creates an account (and its default categories/settings), `/login` signs in, Settings → Account changes the name or password, the account menu signs out.
- `/dashboard`, every app page and every `/api/*` route require a session (pages redirect to `/login`, the API returns 401).
- Login attempts are rate-limited (10 per 15 minutes per address) and registrations too (5 per hour per network).
- `AUTH_ALLOWED_EMAILS` (comma-separated) optionally restricts who may register, which is recommended for a personal finance app that is reachable on the internet.

Setup: generate a secret with `npx auth secret` (or `openssl rand -base64 32`) and put it in `.env` as `AUTH_SECRET`. In development a built-in fallback secret is used when it is missing, so `npm run dev` works immediately; production refuses to serve the app without a real secret and shows a setup screen instead.

`npm run db:seed` creates a demo account (`demo@expenses.local` / `demo12345`) you can sign in with locally.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| Styling / UI | Tailwind CSS 4, shadcn/ui (Base UI primitives), Lucide icons, Montserrat via `next/font` |
| Charts | Recharts 3 |
| Auth | Auth.js v5 credentials provider, scrypt password hashing, JWT sessions |
| Database | MongoDB (local MongoDB Community Server in development, MongoDB Atlas in production, in-memory server for tests) |
| Driver | Official `mongodb` Node.js driver, aggregation pipelines for analytics |
| Validation / forms | Zod 4, React Hook Form |
| AI | Ollama (local) via HTTP; OpenAI-compatible provider; mock provider |
| Testing | Vitest + React Testing Library, Playwright |
| Deployment | Vercel |

## Database

The document shapes (`src/lib/db/schema.ts`) define the `users`, `categories`, `transactions` (tags embedded), `recurring_transactions`, `ai_insights` and `app_settings` collections, all keyed by UUID strings and scoped by `userId`.

- **Local development**: leave `DATABASE_URL` empty and the app uses the MongoDB server on your machine (`mongodb://127.0.0.1:27017/expenses_tracker`). Install MongoDB Community Server if you do not have it.
- **Production**: set `DATABASE_URL` to a MongoDB Atlas connection string (`mongodb+srv://...`). Indexes are created automatically on the first connection; there are no migrations. `npm run db:migrate` only creates the indexes explicitly.
- **Tests**: `DATABASE_URL=memory://` starts a throwaway in-memory MongoDB (`mongodb-memory-server`).

```bash
npm run db:migrate    # create indexes (also done automatically on first connection)
npm run db:seed       # default user, categories and settings
npm run db:seed -- --demo   # ...plus demo transactions tagged "demo" (refused in production)
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
Browser → Next.js → Ollama:11434       Browser → Vercel → MongoDB Atlas
                                                   ↘ optional remote AI provider
```

A Vercel deployment cannot reach the Ollama on your computer; hosted deployments need the OpenAI-compatible provider (or none).

## Environment variables

See `.env.example`. Never commit `.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | empty | MongoDB connection string. Empty = `mongodb://127.0.0.1:27017/expenses_tracker`; `memory://` = in-memory |
| `AUTH_SECRET` | dev fallback | Signs the session cookie; required in production |
| `AUTH_ALLOWED_EMAILS` | empty | Comma-separated allow-list of e-mail addresses that may register |
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

1. Create a free MongoDB Atlas cluster (https://www.mongodb.com/atlas), add a database user, allow access from anywhere (Vercel has no fixed IP), and copy the `mongodb+srv://` connection string with `/expenses_tracker` as the database name.
2. Import the GitHub repository in Vercel (framework preset: Next.js).
3. Environment variables: `DATABASE_URL` (required), `APP_TIMEZONE=Asia/Kolkata`, `AUTH_SECRET` (required) plus `AUTH_ALLOWED_EMAILS` (recommended), and optionally `AI_PROVIDER=openai-compatible` with the `OPENAI_COMPATIBLE_*` values.
4. Deploy. Migrations run on the first request.

## Privacy

Your financial data is stored in your configured database. When using local Ollama, AI requests are processed by your local Ollama instance and never leave your machine. Data is only sent to a third-party AI service if you deliberately configure the OpenAI-compatible provider on the server. Accounts store only your name, e-mail and a scrypt password hash.

## Known limitations

- Multi-document transactions are not used (they need a MongoDB replica set), so a failed import can leave partially imported rows; re-run it in replace mode.
- The PWA manifest makes the app installable, but there is no service worker / offline sync.
- The AI rate limiter is in-memory (per server instance).
- Larger local models (e.g. `llama3.1` 8B) can take minutes per summary on a laptop CPU; choose a smaller model such as `qwen2.5:3b` for faster answers.

## License

Personal project. All rights reserved unless a license file is added.
