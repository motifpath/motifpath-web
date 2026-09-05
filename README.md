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
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` from the Clerk dashboard → API keys (use a **development** instance with Google OAuth enabled) |
| `VITE_CORE_API_URL` | `http://localhost:8080` (default) |
| `VITE_EVENTS_API_URL` | `http://localhost:8081` (default) |

`.env.local` is gitignored — never commit it.

## Local development

```bash
npm run dev          # http://localhost:5173
```

The app needs the Clerk key to load. To exercise the authenticated views
(`/path`), also run the backend — see
[motifpath-core README → Running the services locally](../motifpath-core/README.md#running-the-services-locally).
Without `core-domain` running, `/path` shows its error state (expected) — the
public pages, sign-in, and routing still work.

`core-domain` allows the Vite dev origin (`http://localhost:5173`) via CORS out
of the box.

### Manual onboarding smoke test (PB-8c)

Automated tests cover the registration bridge, guard, and views in isolation
(mocked `coreApi`). This walks the real chain end to end — Clerk → transport →
CORS → `core-domain` → generated types → store → guard/views — with a real
Clerk secret key and `core-domain` running locally
(see [motifpath-core README → Running the services locally](../motifpath-core/README.md#running-the-services-locally)).

**Happy path — first sign-in for an identity:**

1. `npm run dev`, open http://localhost:5173, sign in with Google
2. Land on `/welcome` — "Setting up your account…"
3. `POST /users {role: student}` fires exactly once (check the network tab)
4. Redirected to `/path` — the holding state renders ("Your teacher is
   building your personalized path")

**409 reconciliation — sign out, sign back in with the same identity:**

1. Sign out, sign in again with the same Google account
2. `GET /users/me` returns 200 immediately — no second `POST /users` fires
3. Straight to `/path`, no `/welcome` detour

**Failure and retry:**

1. Stop `core-domain`, then sign in
2. `/welcome/error` renders — "We couldn't finish setting up your account"
3. Restart `core-domain`, click "Try again" — lands on `/path`

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