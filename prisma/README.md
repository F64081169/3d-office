# prisma

SQLite schema (`schema.prisma`) for agents, projects, tasks, chat messages and the append-only event log.

- Prisma 7 with the `better-sqlite3` driver adapter; the config lives in `apps/server/prisma.config.ts`.
- The client is generated into `apps/server/src/generated/prisma` (git-ignored).
- `npm run dev` / `npm start` run `prisma generate && prisma db push` automatically; the database file is
  `apps/server/office.db` (git-ignored). Delete it, or use **Reset company** in the UI, to start over.
