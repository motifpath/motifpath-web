# MOT-164 Capacitor spike — handoff

Throwaway branch `chore/MOT-164/capacitor-spike`. **Never merge it.** It contains temporary
`[probe]` logging (`src/main.ts`, `useAuth.ts`, `nativeClerkClient.ts`), and 18 auth unit tests
fail because their Clerk mock lacks `useClerk`. Findings: MOT-164 comments and ADR-063
(motifpath-specs, branch `spec/MOT-164/adr-063-capacitor-store-apps`).

## What the spike changes
- Capacitor 8.5.3 (`capacitor.config.ts`, `android/`, `ios/`), with `CapacitorHttp` enabled.
- Native Google sign-in: `src/spikes/native-sign-in/nativeGoogleIdToken.ts`, plus the native
  branch in `useAuth.startGoogleSignIn`.
- Clerk native mode (`standardBrowser: false`) with the client token kept by the app:
  `src/spikes/native-sign-in/nativeClerkClient.ts`, wired in `src/main.ts`.
- `mise.toml` pins `java = "temurin-21"`. Gradle fails on Android Studio's bundled JDK 25.
- Android allows cleartext to `localhost` only (`res/xml/network_security_config.xml`), for
  `adb reverse` to a local stack.

## Android on Ubuntu — next steps

### 1. Toolchain (once)
```sh
cd motifpath-web && git fetch && git checkout chore/MOT-164/capacitor-spike
mise trust && mise install          # node 26 + JDK 21
export JAVA_HOME="$(mise where java)" ANDROID_HOME="$HOME/Android/Sdk"
npm ci
```

### 2. Google sign-in needs this machine's signing key registered
The debug build is signed with `~/.android/debug.keystore`. **Either:**
- copy the Mac's `~/.android/debug.keystore` to `~/.android/` here (it's already registered); **or**
- register this machine's SHA-1 in a new Android OAuth client (package `com.motifpath.app`) in
  the `motif-path` Google Cloud project:
  `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`

The phone must have the Google account on it. If the OAuth consent screen is in Testing, the
account must be a test user.

### 3. `.env.local`
```sh
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...   # same dev instance as the Mac
VITE_CORE_API_URL=http://localhost:8080
VITE_EVENTS_API_URL=http://localhost:8081
VITE_GOOGLE_WEB_CLIENT_ID=192807709184-ng1bqoq12necancsqbdc1iop1rs44428.apps.googleusercontent.com
VITE_GOOGLE_IOS_CLIENT_ID=192807709184-svpr4b2jdk8hf7kca268hvovrd7q18qh.apps.googleusercontent.com
```

### 4. Backend reachable from the phone over USB
Run motifpath-core locally (with `MEDIA_PUBLIC_BASE_URL=http://localhost:9000/motifpath-content-media`),
then forward the ports so the phone's `localhost` reaches this PC:
```sh
adb devices                          # phone listed as "device"
adb reverse tcp:8080 tcp:8080        # core-domain
adb reverse tcp:8081 tcp:8081        # event-ingestion
adb reverse tcp:9000 tcp:9000        # media (samples)
```
Re-run `adb reverse` after reconnecting the phone.

### 5. Build and run
```sh
npm run build-only && npx cap sync android && npx cap run android
```
JS console: `adb logcat | grep -E "Capacitor/Console|CapgoSocialLogin|GoogleProvider"`.
Error `[28444] Developer console is not set up correctly` means the signing SHA-1 isn't
registered (see step 2).

### 6. What to check (fill in MOT-164)
1. **Sign-in:** the native Google picker appears, and you land on home.
2. **Session persistence:** force-stop the app, reopen it, and you're still signed in.
3. **Practice with sound:** samples load and play.
4. **Latency, the release gate:**
   - Run the **tap check** on the Android phone and on the iPhone, same person. Compare
     `median_tap_ms` from the `practice.tap_check_completed` events (admin → alpha → events). That
     measures touch-to-screen latency.
   - Run the metronome and a timed drill. Does the click feel late or uneven compared with the
     iPhone? That measures audio output delay, which the tap check doesn't cover.
   - Note the phone model and Android version.
5. **Lesson video:** plays and seeks.
6. **Back gesture and safe areas:** note anything odd.
