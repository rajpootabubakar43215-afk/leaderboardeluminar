# ELUMINAR Leaderboard

## Overview

Web app that connects to a Call of Duty 1.1 server via SFTP, reads the
`main/users.dat` and `main/stat.dat` files, and renders a live, paginated
player leaderboard with hover-card stat breakdowns. Branded as
**ELUMINAR LEADERBOARD** for the **ELUMINAR RIFLES S&D** community.

## Stack

- **Monorepo tool**: pnpm workspaces (Node 24, TypeScript 5.9)
- **Frontend artifact**: `artifacts/leaderboard` — React + Vite + Tailwind v4 + shadcn/ui, served at `/`
- **Backend artifact**: `artifacts/api-server` — Express 5, served at `/api`
- **API contract**: OpenAPI in `lib/api-spec/openapi.yaml`, codegen via Orval
- **SFTP client**: `ssh2-sftp-client` (externalized in api-server `build.mjs`)
- **Validation**: Zod (`zod/v4`)

## Architecture

- `artifacts/api-server/src/lib/sftpStats.ts` — SFTP fetch + .dat parsing + 30s in-memory cache + sort helpers
- `artifacts/api-server/src/routes/leaderboard.ts` — `GET /api/leaderboard` with `page`, `pageSize`, `sortBy`, `sortDir`, `search` query params
- `artifacts/leaderboard/src/pages/home.tsx` — leaderboard page (sortable table, pagination, debounced search, hover-card details, live ticking server clock)

## SFTP / RCON Configuration

All credentials live in environment variables (shared environment):

- `SFTP_HOST`, `SFTP_PORT`, `SFTP_USER`, `SFTP_PASS`
- `SFTP_USERS_FILE` (default `main/users.dat`)
- `SFTP_STATS_FILE` (default `main/stat.dat`)
- `RCON_IP`, `RCON_PORT`, `RCON_PASS` (reserved for future online-player count)

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regen client + Zod schemas after editing the OpenAPI spec
- Workflows: `artifacts/api-server: API Server` and `artifacts/leaderboard: web`

## Notes

- `ssh2-sftp-client` and `ssh2` are listed in `artifacts/api-server/build.mjs` `external` to avoid bundling native deps; they resolve through pnpm's hoisted layout at runtime.
- The leaderboard endpoint caches the SFTP fetch for 30s to avoid hammering the game server.
- The Shop / Spent column from the original inspiration is intentionally omitted.
