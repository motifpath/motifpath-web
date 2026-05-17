# motifpath-web

Vue 3 SPA for MotifPath — student and teacher-facing frontend.

## Tech Stack

- [Vue 3](https://vuejs.org/) with Composition API (`<script setup>`)
- [TypeScript](https://www.typescriptlang.org/) — strict mode
- [Vite](https://vitejs.dev/) — build tool
- [Pinia](https://pinia.vuejs.org/) — state management
- [Vue Router](https://router.vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) — unit and component tests
- [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) — generated API types

## Onboarding

First-time machine setup is handled from `motifpath-specs` — see its
[README](../motifpath-specs/README.md#onboarding) for the full setup steps
(global CLAUDE.md + Claude skill installation).

## Branching Model

```
main  (protected — production releases only)
dev   (protected — integration branch, target for all feature PRs)
```

Branch naming — task code is mandatory:

```
feat/MTP-001/short-description    ← branches from dev
fix/BUG-042/short-description     ← branches from dev
hotfix/BUG-099/short-description  ← branches from main (critical production fixes only)
```

After any merge to `main`, the `sync-main-to-dev` workflow opens a PR
from `main` to `dev` automatically. Review and merge it promptly.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
```

## Commands

```bash
# Start development server
npm run dev

# Regenerate API client types from spec (run after spec changes in motifpath-specs)
npm run generate:api

# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

## Project Structure

```
src/
  features/
    student/          → student-facing views and composables
    teacher/          → teacher-facing views and composables
    auth/             → authentication flow
  shared/
    components/       → shared UI components
    composables/      → shared composables (use* prefix)
    utils/            → utility functions
    types/            → shared TypeScript types
  api/
    generated/        → generated API types (do not edit — run generate:api)
  stores/             → Pinia stores
  router/             → Vue Router configuration
```

## API Client

All API types are generated from the OpenAPI spec in
[motifpath-specs](../motifpath-specs). After a spec update:

```bash
npm run generate:api
```

Never define manual interfaces that duplicate generated types.
Never edit files in `src/api/generated/`.

## Testing

Component tests use Vitest and Vue Test Utils.
Tests assert behavior from the user's perspective — what renders,
what happens on interaction — not internal implementation details.

```bash
npm run test          # run all tests
npm run test:coverage # run with coverage report
```

## Related Repositories

| Repository | Purpose |
|---|---|
| [motifpath-specs](../motifpath-specs) | All specs — API contracts live here |
| [motifpath-core](../motifpath-core) | Go backend services |
| [motifpath-infra](../motifpath-infra) | Terraform infrastructure |