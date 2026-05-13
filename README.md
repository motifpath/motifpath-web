# motifpath-web

Vue 3 SPA — student and teacher-facing frontend for the MotifPath platform.

**Stack:** Vue 3 · TypeScript (strict) · Vite · Pinia · Vue Router · Tailwind CSS · Vitest

## Getting Started

```bash
npm install
npm run generate:api   # generate API client from motifpath-specs (run once and after spec updates)
npm run dev            # start dev server at http://localhost:5173
```

## Directory Structure

```
src/
  features/
    student/          student-facing pages and logic
    teacher/          teacher-facing pages and logic
    auth/             authentication flows
  shared/
    components/       shared UI components
    composables/      reusable composition functions (use* prefix)
    utils/            pure utility functions
    types/            shared TypeScript types
  api/
    generated/        generated API client — DO NOT EDIT
  stores/             Pinia stores
  router/             Vue Router configuration
```

## Scripts

```
npm run dev            start Vite dev server
npm run build          production build
npm run typecheck      run tsc --noEmit
npm run lint           ESLint
npm test               Vitest unit + component tests
npm run generate:api   regenerate API client from motifpath-specs
```

## Key Conventions

**API client** — all types come from `src/api/generated/`. Never define manual interfaces that duplicate generated types. Regenerate with `npm run generate:api` after any spec update in motifpath-specs.

**Components** — always use `<script setup lang="ts">`. Never use Options API. Never call the API directly from a component; use a composable or Pinia store.

**TypeScript** — strict mode enforced. No `any`; use `unknown` and narrow explicitly. No type assertions (`as SomeType`) to silence errors.

**Styling** — Tailwind utility classes only. No inline styles. No hardcoded color or spacing values; use design tokens in `tailwind.config.ts`.

**Routing** — always use named routes. Never hardcode path strings in components.

## Testing

Component tests use Vitest and Vue Test Utils. Test from the user's perspective — what renders and what happens on interaction. No E2E tests at MVP.
