# QA Studio

A local-first manual QA test management web app — a focused Testmo-style
workspace for projects, test suites, cases, runs, exploratory sessions, and
defects. No CI, no automation, no third-party integrations.

Standalone project at `~/Desktop/qa-studio` — independent of any other repo.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS v4
- Prisma 7 + better-sqlite3 (file `dev.db` at project root)
- Recharts (Phase 3, for reports)
- No auth — single local user

## Run it

```bash
npm install
npm run db:reset    # apply migrations + seed
npm run dev         # http://localhost:3000
```

## Scripts

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the dev server                               |
| `npm run db:seed`   | Re-run the seed without resetting the DB           |
| `npm run db:reset`  | Drop, re-migrate, and reseed `dev.db`              |
| `npm run db:studio` | Open Prisma Studio to browse the SQLite database   |
| `npm run build`     | Production build                                   |

## Layout

```
src/
  app/
    page.tsx                ← project picker
    p/[projectKey]/         ← per-project workspace
      page.tsx              ← dashboard
      suites/, cases/,
      runs/, exploratory/,
      defects/, reports/
  components/
    app-shell/              ← sidebar, page header
    ui/                     ← Button, Card, Badge, EmptyState (hand-rolled)
  lib/
    prisma.ts               ← Prisma client singleton (SQLite adapter)
    constants.ts            ← string-enum values (priorities, statuses, ...)
  generated/prisma/         ← Prisma-generated client (gitignored)
prisma/
  schema.prisma             ← data model
  seed.ts                   ← seeds Toolbox Apps QA + WrenchNode QA
  migrations/               ← Prisma migrations
dev.db                      ← SQLite file (gitignored)
```

## Build phases

- **Phase 0 (done)**: schema, seed, sidebar shell, read-only list pages.
- **Phase 1**: project / suite / case CRUD, run creation + execution, dashboard wiring.
- **Phase 2**: defect CRUD + "create defect from failed run result".
- **Phase 3**: exploratory sessions, reports (Recharts), local image attachments.
