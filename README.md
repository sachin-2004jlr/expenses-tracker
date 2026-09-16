# Expenses Tracker

A personal finance tracker for income, expenses and savings in **Indian Rupees (₹, en-IN)** with **e-mail + password accounts**. Dark, trading-desk style interface. Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Auth.js and MongoDB. Deploys to Vercel.

Repository: https://github.com/sachin-2004jlr/expenses-tracker

> Every number on screen is calculated by application code from your own transactions. Nothing is estimated.

---

## Features

- **Landing page** (`/`) with a bold uppercase hero, product preview built from the real dashboard cards, feature grid and privacy section.
- **Accounts** (`/register`, `/login`) with e-mail and password: scrypt-hashed passwords, encrypted session cookies, optional allow-list of e-mail addresses, name and password changes in Settings → Account.
- **Dashboard** (`/dashboard`): total balance hero with a day-by-day balance line, saved-this-month panel, recent activity with per-day burn rate, quick-action tiles, bright-green income card with trend, expenses card with trend and daily rate, dotted savings-rate gauge, top category with share slider, monthly spending bars (current month highlighted), category donut and month-over-month comparison.
- **Top bar**: month selector pill (previous / next / today, future months allowed), orange add button, global search that jumps to filtered transactions, quick links, account menu with theme switch and sign-out.
- **Add money in seconds**: income / expense toggle, amount auto-focused, category, date, tags and notes, validated on the client and again on the server. Edit, duplicate and confirmed delete on every transaction.
- **Transactions**: full-text search across description, notes, category and tags, type / category / tag / date-range / amount-range filters, sortable columns, pagination; tables become cards on phones.
- **Calendar**: month grid with per-day income and expense totals, week view, day panel, add-on-this-day.
- **Analytics**: income / expense / savings trends, category spending, income sources, largest expenses, averages, best month, month comparison with percentages calculated in application code.
- **Categories, tags, recurring rules** (salary, rent, EMIs, subscriptions post themselves on due dates).
- **Settings**: general (currency, locale, date format, first day of week, time zone), account, categories, recurring, data (JSON / CSV export, validated import, clear data), appearance (dark by default, light and system available).
- Skeleton loading states, empty states, error boundaries, database-not-configured screen, keyboard-accessible dialogs and menus, labelled icon buttons, reduced-motion support, installable PWA manifest.

## Architecture

```
src/
  app/
    page.tsx                Landing page
    login/  register/       Sign-in and account creation pages
    (app)/                  Signed-in shell: dashboard, transactions, calendar, analytics, settings
    api/                    Route handlers: auth, transactions, categories, analytics, settings, export, import
  components/
    ui/                     shadcn/ui primitives (Base UI)
    layout/                 Icon rail sidebar, top bar, mobile tab bar, app shell
    shared/                 Brand logo, avatar, money formatting, stat cards, dialogs, selectors
  features/
    auth/  dashboard/  transactions/  calendar/  analytics/  settings/  recurring/
  lib/
    auth.ts  password.ts    Auth.js configuration (credentials provider, JWT sessions, allow-list), scrypt hashing
    db/                     MongoDB document types, client (local MongoDB or Atlas), index setup
    money/  dates/          Integer-paise money utilities, timezone-safe date helpers, recurrence
    analytics/              Pure financial calculations (tested) + MongoDB aggregation queries
    validation/             Zod schemas for every input and for import files
    services/               Transactions, categories, tags, settings, recurring, export/import, users
    api/                    JSON helpers, error mapping, rate limiting
scripts/                    db:migrate and db:seed
e2e/                        Playwright tests
```

**Data flow**: pages are React Server Components that call the service layer directly. Mutations use Server Actions that revalidate the whole app. The same services back the JSON API routes used by export/import and external tooling.

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
| Testing | Vitest + React Testing Library, Playwright |
| Deployment | Vercel |

## Database

The document shapes (`src/lib/db/schema.ts`) define the `users`, `categories`, `transactions` (tags embedded), `recurring_transactions` and `app_settings` collections, all keyed by UUID strings and scoped by `userId`.

- **Local development**: leave `DATABASE_URL` empty and the app uses the MongoDB server on your machine (`mongodb://127.0.0.1:27017/expenses_tracker`). Install MongoDB Community Server if you do not have it, or point `DATABASE_URL` at an Atlas cluster instead.
- **Production**: set `DATABASE_URL` to a MongoDB Atlas connection string. Indexes are created automatically on the first connection; there are no migrations. `npm run db:migrate` only creates the indexes explicitly.
- **Tests**: `DATABASE_URL=memory://` starts a throwaway in-memory MongoDB (`mongodb-memory-server`).

If a `mongodb+srv://` string fails with `querySrv ECONNREFUSED`, your network blocks DNS SRV lookups. Use the *standard connection string* that Atlas shows for older drivers instead (`mongodb://host1:27017,host2:27017,host3:27017/expenses_tracker?tls=true&replicaSet=...&authSource=admin`); `.env.example` has the full shape.

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

## Environment variables

See `.env.example`. Never commit `.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | empty | MongoDB connection string. Empty = `mongodb://127.0.0.1:27017/expenses_tracker`; `memory://` = in-memory |
| `AUTH_SECRET` | dev fallback | Signs the session cookie; required in production |
| `AUTH_ALLOWED_EMAILS` | empty | Comma-separated allow-list of e-mail addresses that may register |
| `APP_TIMEZONE` | `Asia/Kolkata` | Time zone used to compute "today" |

## Testing

```bash
npm run lint        # ESLint (Next.js + React Compiler rules)
npm run typecheck   # tsc --noEmit
npm test            # Vitest unit + component tests
npm run test:e2e    # Playwright: builds the app and serves it on port 3100 with an in-memory DB
```

## Build

```bash
npm run build
npm start
```

## Vercel deployment

1. Create a free MongoDB Atlas cluster (https://www.mongodb.com/atlas), add a database user, allow access from anywhere (Vercel has no fixed IP), and copy the connection string with `/expenses_tracker` as the database name.
2. Import the GitHub repository in Vercel (framework preset: Next.js).
3. Environment variables: `DATABASE_URL` (required), `AUTH_SECRET` (required), `AUTH_ALLOWED_EMAILS` (recommended) and `APP_TIMEZONE=Asia/Kolkata`.
4. Deploy. Indexes are created on the first request. Every push to `main` redeploys automatically.

## Privacy

Your financial data is stored only in the MongoDB database you configure. No third-party service receives it. Accounts store only your name, e-mail and a scrypt password hash.

## Known limitations

- Multi-document transactions are not used (they need a MongoDB replica set), so a failed import can leave partially imported rows; re-run it in replace mode.
- The PWA manifest makes the app installable, but there is no service worker / offline sync.
- The login / registration rate limiter is in-memory (per server instance).

## License

Personal project. All rights reserved unless a license file is added.
