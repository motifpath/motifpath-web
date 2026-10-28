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
feat/…  →  dev  →  stage  →  main
                    │         │
                 staging   production
```

- `dev`: feature integration; nothing is deployed.
- `stage`: release candidate; every push deploys to `https://staging.motifpath.com`.
- `main`: production; deployed by hand (see [Deploying](#deploying)).

Promote `dev` → `stage` → `main` with **merge commits**, never squash: production
only deploys a commit that is on `main`, and a squash creates a different one.

Branch naming — task code is mandatory:

```
feat/MTP-001/short-description    ← branches from dev
fix/BUG-042/short-description     ← branches from dev
hotfix/BUG-099/short-description  ← branches from main (critical production fixes only)
```

After any merge to `main`, the `sync-main-to-dev` workflow opens a PR
from `main` to `dev` automatically. Review and merge it promptly.

## Prerequisites

- [mise](https://mise.jdx.dev), activated in your shell — installs the Node.js version pinned in
  `mise.toml` (npm comes with it). If you set up `motifpath-core` first, you already have it.
- The other MotifPath repositories cloned **side by side in the same parent directory** —
  `npm run generate:api` reads `../motifpath-specs`, and the full stack runs from
  `../motifpath-core`.

## Setup

```bash
mise trust && mise install   # Node.js, at the version in mise.toml
npm install
npx playwright install --with-deps chromium   # the browser the Storybook story tests run in
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` from the Clerk dashboard → API keys — the same **development** instance (Google sign-in enabled) whose secret key `motifpath-core` uses; see [Clerk keys](../motifpath-core/README.md#clerk-keys) |
| `VITE_CORE_API_URL` | `http://localhost:8080` (default) |
| `VITE_EVENTS_API_URL` | `http://localhost:8081` (default) |
| `VITE_CONCIERGE_WHATSAPP_NUMBER` | Optional. The number behind the student "Send to your teacher" button, in international format; leave empty to hide the button |

`.env.local` is gitignored — never commit it.

## Local development

Frontend only:

```bash
npm run dev          # http://localhost:5173
```

Whole stack in one command — from `motifpath-core`, with this repo checked out
as a sibling and `npm install` already run here:

```bash
cd ../motifpath-core
make dev                                                        # dependency containers
mise run full                                                   # backend + aggregation-worker + web
```

`web` runs `npm run dev` for this repo; the backend services rebuild on save.
See [motifpath-core README → Running the services locally](../motifpath-core/README.md#running-the-services-locally).

The app needs the Clerk key to load. Without `core-domain` running, `/path`
shows its error state (expected) — the public pages, sign-in, and routing still
work.

`core-domain` allows the Vite dev origin (`http://localhost:5173`) via CORS out
of the box.

### Manual onboarding smoke test (PB-8c)

Automated tests cover the registration bridge, guard, and views in isolation
(mocked `coreApi`). This walks the real chain end to end — Clerk → transport →
CORS → `core-domain` → generated types → store → guard/views.

Run the full stack via `motifpath-core`'s `mise run full` (above).
`core-domain`'s `CLERK_SECRET_KEY` must be the **secret** key (`sk_test_…`) from
the same Clerk instance as `VITE_CLERK_PUBLISHABLE_KEY` here — a `pk_test_…`
value there makes every authenticated call 401 and sign-in dead-ends at
`/welcome/error`.

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

# Component catalog (see STORYBOOK.md)
npm run storybook

# Every Storybook story as a test (render, interactions, mocked API, accessibility)
npm run test:storybook
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

Every library component has a Storybook story beside it, built against a mock API.
The rules are in [STORYBOOK.md](STORYBOOK.md).

## Running the app on a device

The iOS and Android apps wrap this same web build with [Capacitor](https://capacitorjs.com).
`ios/` and `android/` are native projects. The web build is copied into them with `cap sync`
and is never committed.

**Toolchain:** Xcode (iOS, macOS only). Android Studio or the Android SDK command-line tools,
with JDK 21 from `mise.toml`. The Gradle build fails on Android Studio's bundled JDK 25.

```bash
mise install                                   # node + JDK 21
export JAVA_HOME="$(mise where java)"          # for Gradle
export ANDROID_HOME="$HOME/Library/Android/sdk"   # ~/Android/Sdk on Linux

npm run cap:sync                               # web build → both native projects
npx cap run ios                                # pick a simulator or a connected iPhone
npx cap run android                            # a connected phone with USB debugging on
```

Both apps send every `fetch` and XHR through the native network stack (`CapacitorHttp`). Native
requests carry no `Origin` header and aren't subject to CORS. The exceptions are presigned media
uploads, which go through the WebView so that large files keep their progress. In the app, they
need the media bucket's CORS to allow `capacitor://localhost` (iOS) and `https://localhost`
(Android).

### Against a local stack

Debug builds are the only builds that can reach plain `http` on `localhost` (Android) or the
local network (iOS). Release builds can't.

**Android, over USB:** forward the phone's `localhost` ports to this machine, so the default
`.env.local` URLs work unchanged:

```bash
adb reverse tcp:8080 tcp:8080   # core-domain
adb reverse tcp:8081 tcp:8081   # event-ingestion
adb reverse tcp:9000 tcp:9000   # media (instrument samples, uploads)
```

Run it again after reconnecting the phone.

**iOS Simulator:** `localhost` is this Mac, so nothing changes.

**iPhone:** it reaches this Mac over Wi-Fi. Build with `VITE_CORE_API_URL` and
`VITE_EVENTS_API_URL` set to the Mac's LAN address (`http://192.168.x.y:8080`, `…:8081`). Run
`motifpath-core` with `MEDIA_PUBLIC_BASE_URL` on that address too, so media URLs work on the
phone. Allow the app's local-network prompt on first launch.

### Logs

Debug builds only. Release builds log nothing, because the console can print sign-in tokens.
- iOS: Xcode's console, or Safari → Develop → the device → the app's page.
- Android: `adb logcat | grep Capacitor`, or `chrome://inspect` for the WebView.

## Deploying

`.github/workflows/deploy.yml` builds the SPA for one environment and syncs it to
that environment's S3 bucket behind CloudFront. Hashed `assets/` are cached for a
year; `index.html` and the other entry files are always revalidated, and the CDN is
invalidated after each deploy.

- **Staging** deploys on every push to `stage`.
- **Production** deploys a **release**: tag the `stage → main` merge commit on `main`
  with the next version and push the tag. Untagged builds are intermediate ones
  (release candidates on `stage`).

  ```bash
  git fetch origin main && git tag -a v0.2.0 origin/main -m "v0.2.0" && git push origin v0.2.0
  ```

  The tag builds and publishes that commit (after the `production` environment's
  approval, if it has reviewers), then publishes a GitHub Release with notes since the
  previous tag. A tag that is not on `main` is refused. Versions are this repository's
  own; motifpath-core numbers its releases separately.
- **Rollback or redeploy**: Actions → Deploy → Run workflow on `main`, with
  `environment: production` and `release` set to an earlier tag. In an emergency
  `release` also takes a full commit SHA on `main`; that deploy publishes no release.

  ```bash
  gh workflow run deploy.yml -R motifpath/motifpath-web --ref main -f environment=production -f release=v0.1.0
  ```

Each GitHub environment (`staging`: branches `stage`, `main`; `production`: **Selected
branches and tags** with branch `main` and tag pattern `v*`, with required reviewers) needs:

| Kind | Name | Value |
|---|---|---|
| secret | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | motifpath-infra `environments/<env>` outputs `web_deploy_access_key_id` / `web_deploy_secret_access_key` |
| variable | `SPA_BUCKET` / `SPA_DISTRIBUTION_ID` | outputs `spa_bucket_name` / `spa_distribution_id` |
| variable | `VITE_CORE_API_URL` | `https://api.staging.motifpath.com` / `https://api.motifpath.com` |
| variable | `VITE_EVENTS_API_URL` | `https://events.staging.motifpath.com` / `https://events.motifpath.com` |
| variable | `VITE_CLERK_PUBLISHABLE_KEY` | The whole Publishable key of the Clerk development (`pk_test_…`) / production (`pk_live_…`) instance; the deploy refuses one that does not decode to a Clerk host |
| variable | `VITE_CONCIERGE_WHATSAPP_NUMBER` | optional; empty hides the button |

The publishable key is public by design (it ships in the bundle), so it is a variable,
not a secret.

## Related Repositories

| Repository | Purpose |
|---|---|
| [motifpath-specs](../motifpath-specs) | All specs — API contracts live here |
| [motifpath-core](../motifpath-core) | Go backend services |
| [motifpath-infra](../motifpath-infra) | Terraform infrastructure |