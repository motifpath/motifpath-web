# Storybook

Storybook is the executable catalog of the component library. It renders the real components, so it
cannot drift from the app. Code and Storybook are the source of truth for what a component looks like
and how it behaves; Figma is where the visual language is explored, not a spec the code must match.

```bash
npm run storybook        # catalog on http://localhost:6006
npm run build-storybook  # static build, as CI runs it
npm run test:storybook   # every story as a test, in headless Chromium
```

The first `test:storybook` on a machine needs `npx playwright install chromium`.

## What enters the library

- A component moves into `src/shared/components` when a real flow needs it, not ahead of time.
- No `Mp` (or other) prefix: the folder already says it's ours.
- Colours, spacing and type come from the semantic tokens only (`bg-surface`, `text-ink-muted`,
  `border-border`…), never raw palette values, so light and dark both work.

## Every library component has a story beside it

`Foo.vue` ships with `Foo.stories.ts` in the same folder. `storybook-coverage.spec.ts` fails `npm test`
when one is missing, for everything in `src/shared/components` and for any component under
`src/features` that more than one feature imports (shared in all but location).

A story file shows:

- **One named story per state** — `Default`, `Selected`, `Disabled`, `Empty`, `Loading`, `Failed`… —
  with the common `args` in `meta` so each story only states what differs.
- **A `LongPortuguese` story** wherever text length matters: pt-BR runs longer than English, and that
  is where truncation and wrapping break.
- **Grouped titles**, by what the component is for: `'Cards & progress/StepRow'`,
  `'Selection/InstrumentPicker'`, `'States/StateError'`. Reuse an existing group before adding one.

The toolbars render every story in each combination it has to survive, so check them before calling a
story done:

| Toolbar | Values |
|---|---|
| Theme | light, dark |
| Locale | en, pt-BR |
| Role | student, teacher, admin |
| Viewport | Compact 390 · Medium 720 · Expanded 1280 |

## Data: fixtures and the mock API

- Fixtures come from `src/shared/testUtils` (`makeFrettedDiagram`, `knowledgeNode`, `makeSongChart`…),
  the same ones the unit tests use. Add to them rather than inlining a payload in a story.
- **No story calls Clerk or the real API.** Clerk is replaced by a signed-in stub
  (`.storybook/mocks/useAuth.ts`). API calls are answered by a mock API
  ([MSW](https://mswjs.io)), and a call no handler covers fails the story test, so a story can't
  sit in a loading state by accident or reach a real backend.

The mock API's default answers live in `src/shared/testUtils/msw/`: `fixtures.ts` holds the payloads,
`handlers.ts` names one handler per endpoint (`instruments`, `creators`, `voices`, `diagram`,
`knowledgeNodes`, `knowledgeEdges`, `practiceOverview`, `practiceSummary`, `publishedSongChart`,
`events`). A story replaces only the endpoints its state is about, with `respondWith`, `pending`,
`failing` or `notFound`:

```ts
import { failing, pending, respondWith } from '@/shared/testUtils/msw/handlers'

export const Empty: Story = { parameters: { msw: { handlers: { instruments: respondWith('instruments', []) } } } }
export const Loading: Story = { parameters: { msw: { handlers: { instruments: pending('instruments') } } } }
export const Failed: Story = { parameters: { msw: { handlers: { instruments: failing('instruments') } } } }
```

A component that needs a new endpoint adds it to `endpoints` and `defaultHandlers` in `handlers.ts`,
with its payload in `fixtures.ts`, typed from the generated API types.

A state that only shows after an interaction (an open listbox, a focused field) gets a `play` function
that performs it, as `TeacherFilterPicker`'s stories do.

## Stories are tests

`npm run test:storybook` (Storybook's Vitest addon) renders every story in Chromium. A story fails
when it throws, when its `play` function fails, when it calls an endpoint with no mock handler, or
when [axe](https://github.com/dequelabs/axe-core) finds an accessibility violation
(`a11y: { test: 'error' }`). CI runs it and the Storybook build on every PR.

Fix a violation in the component. When the story is what's wrong, fix the story: wrap a list item in
the list its caller provides, label a control the way its callers do. Waive a rule only when neither
can be fixed yet, on the narrowest scope that works, with the reason beside it:

```ts
export const Decorative: Story = {
  parameters: {
    a11y: {
      // The illustration's text is decorative and hidden from assistive technology.
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
}
```

One waiver is global for now: text in `ink-subtle` (set on it or inherited) skips `color-contrast`,
because the token measures 2.8:1 until the signed-off darker value lands. That change removes the
waiver from `.storybook/preview.ts`.

## Story-first, per slice

A slice's new components land with their stories before the screen that composes them. Build the
component against its stories — every state, both themes, both locales, the three sizes — then compose
the screen.
