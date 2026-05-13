# motifpath-web

Web frontend for Motifpath. Depends on motifpath-core for domain logic.

## Stack assumptions

Update this section once the stack is locked in. Common choices:
- Framework: Next.js / Remix / Vite+React
- Styling: Tailwind / CSS Modules
- State: Zustand / TanStack Query
- Testing: Vitest + Testing Library

## Key rules

- Components in `src/components/` must be presentational; no direct API calls
- API calls go through `src/lib/api/`; never fetch directly from components
- Every new page/route needs a corresponding test
- Avoid client-side state for data that can live in the URL or server

## Testing

- `npm test` — unit + component tests
- `npm run test:e2e` — end-to-end (Playwright, when configured)
- Test files co-located: `Button.tsx` → `Button.test.tsx`

## How to help

- Check the designs in motifpath-specs before implementing new UI
- Prefer server components where possible (if using Next.js App Router)
- Flag any component that imports directly from an external API client
