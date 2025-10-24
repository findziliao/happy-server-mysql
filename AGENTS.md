# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `sources/`:
  - `app/` (API, `routes/`, `socket/`, `auth/`, `monitoring/`, `presence/`)
  - `modules/` (e.g., `encrypt`, `github`)
  - `storage/` (Prisma DB, Redis, files) and `utils/`
  - Entry: `sources/main.ts`. Path alias `@/` maps to `sources/` (see `tsconfig.json`).
- Database: `prisma/schema.prisma` + `prisma/migrations/`.
- Tests are colocated as `*.spec.ts` / `*.test.ts` next to code.
- Deploy manifests in `deploy/`. Dockerfile provided.

## Build, Test, and Development Commands
- `yarn dev` – Start locally on `:3005` using `.env` + `.env.dev`.
- `yarn start` – Production run via `tsx`.
- `yarn build` – Type-check TypeScript (no emit).
- `yarn test` – Run Vitest test suite.
- Local deps: `yarn db` (Postgres), `yarn redis`, `yarn s3` then `yarn s3:init` (MinIO bucket).
- Prisma: `yarn migrate`, `yarn migrate:reset`, `yarn generate`.
- Metrics: `/metrics` on `:9090` when `METRICS_ENABLED=true`.

## Coding Style & Naming Conventions
- TypeScript, strict mode. Use `@/` imports. 2-space indent, semicolons.
- Prefer named exports, small modules, and explicit types.
- Files: camelCase (e.g., `accountRoutes.ts`). New HTTP handlers go in `sources/app/api/routes` and are registered in `sources/app/api/api.ts`.
- Validate request/response with Zod (`fastify-type-provider-zod`).

## Testing Guidelines
- Framework: Vitest. Name tests `*.spec.ts` or `*.test.ts`, colocated with code (examples: `utils/lru.spec.ts`, `storage/processImage.spec.ts`).
- Run with `yarn test`. Mock network/IO; keep tests deterministic.
- Add tests for new routes, storage utilities, and edge cases. Coverage isn’t enforced but aim for meaningful assertions.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `ref:` (see `git log`). Keep subjects imperative and concise.
- PRs must include: what/why, how tested (commands), screenshots or curl examples for new endpoints, linked issues, and migration notes if `prisma/schema.prisma` changed.
- Keep changes scoped; avoid unrelated refactors.

## Security & Configuration Tips
- Local defaults in `.env.dev`; real secrets in `.env` (untracked). Set `HANDY_MASTER_SECRET`, `DATABASE_URL`, and S3/Redis vars.
- Do not log sensitive data. Leave `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` off outside local.
- Don’t commit generated data (`.pgdata`, `.minio`) or secrets.
