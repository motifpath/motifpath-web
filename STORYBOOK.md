# Storybook

Storybook is the executable catalog of the component library. It renders the real components, so it
cannot drift from the app. Code and Storybook are the source of truth for what a component looks like
and how it behaves; Figma is where the visual language is explored, not a spec the code must match.

```bash
npm run storybook        # catalog on http://localhost:6006
npm run build-storybook  # static build, as CI runs it
```

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
  ([MSW](https://mswjs.io)), and a call no handler covers is reported as an error, so a story can't
  sit in a loading state by accident.

The mock API's default answers live in `src/shared/testUtils/msw/`: `fixtures.ts` holds the payloads,
`handlers.ts` names one handler per endpoint (`instruments`, `creators`, `voices`, `diagram`,
`knowledgeNodes`, `knowledgeEdges`, `practiceOverview`, `practiceSummary`). A story replaces only the
endpoints its state is about:

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

## Story-first, per slice

A slice's new components land with their stories before the screen that composes them. Build the
component against its stories — every state, both themes, both locales, the three sizes — then compose
the screen.
