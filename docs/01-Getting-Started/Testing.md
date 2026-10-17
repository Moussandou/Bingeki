# Testing

Use Node 22.19+ (CI and Functions use Node 22), npm, Java 21+ for Firebase
emulators, and Chromium. Install with `npm ci` and `npm ci --prefix functions`.

| Command | Scope |
| --- | --- |
| `npm run lint` | ESLint, including hooks rules |
| `npm run validate:i18n` | French/English translation key parity |
| `npm run test:run` | Unit/component tests and network-free Functions helpers |
| `npm run test:coverage` | V8 coverage, including existing store/hook/utility thresholds |
| `npm run test:rules` | Firestore/Storage rules; requires running emulators |
| `npm run test:e2e` | Playwright Chromium against a dedicated isolated Vite server |
| `npm run build:isolated` | TypeScript, Vite and validated offline prerender using demo configuration |
| `node scripts/smoke-renderer.cjs` | Functions cold-start and offline JPEG rendering (no upload) |
| `npm run audit` | Production build and Lighthouse; not a lint/unit-test command |

## Isolated integration and E2E

```bash
npx playwright install chromium
bash scripts/start-emulators.sh "npm run test:emulator && npm run test:e2e"
```

The harness pins Firebase CLI 15.34.0, explicitly selects
`demo-bingeki-quality`, starts Auth (9099), Firestore (8080) and Storage (9199)
on loopback, and shuts down even if tests fail. It does not start scheduled
Functions or use `.firebaserc`'s real default project. Playwright uses port 5178,
never reuses an existing server, and loads the committed `.env.isolated`.
Client emulator mode refuses non-`demo-` project IDs and connects all four
Firebase clients (Functions points at 5001; no Functions emulator is required
for these browser fixtures).

Browser tests fulfill catalog reads with deterministic fixtures and abort all
other external HTTP requests, including real Firebase. Auth and application
data writes exercise actual local emulators; do not run signup tests against
production or configure real accounts. Unit mocks are not evidence that rules
or browser journeys pass. The rules suite uses its own test project; account
cleanup integration tests from the functional flows suite use
`demo-bingeki-flows` with the same explicit emulator hosts.

## Build and SEO

The normal `npm run build` requires the Firebase environment values documented
in `.env.example`; missing required configuration fails before bundling.
For local isolated validation, use `npm run build:isolated`. Puppeteer normally
installs Chrome during `npm ci`. On a machine using a system browser:

```bash
PUPPETEER_EXECUTABLE_PATH="/path/to/chrome" npm run build:isolated
PUPPETEER_EXECUTABLE_PATH="/path/to/chrome" node scripts/smoke-renderer.cjs
```

Prerender checks actual application content, a heading, language, title and
browser exceptions, not the size of the static HTML shell. Failed routes fail
the build; output is written only after all routes succeed. The manifest covers
43 entries, including current `/releases` and legacy schedule/season aliases;
the unfinished Challenges placeholder is deliberately not prerendered.
Offline builds block external requests and do not require catalog services.
`npm run test:seo -- --base-url http://localhost:PORT` checks a running server;
without an explicit base URL it targets the public site (read-only).

## CI guarantees and limits

CI blocks on lint, translation parity, coverage thresholds, root/Functions
audits at **high**, isolated build, renderer smoke, rules and browser tests.
Lighthouse executes but its configured score assertions remain warnings
(performance 0.7; accessibility/best-practices/SEO 0.8); there is no 90+/100
guarantee. The existing coverage thresholds are not reduced.

Root production dependencies and Functions audit clean after the targeted
updates. Five moderate audit entries remain in development-only
`@lhci/cli -> @lhci/utils -> js-yaml@3 -> argparse -> sprintf-js`
([GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)):
unbounded precision format strings can cause denial of service. This tooling
reads trusted repository configuration and is not shipped as application code.
No patched `sprintf-js` release is available; forcing `js-yaml@4` would break
LHCI's `safeLoad` API. Audits still report these entries and fail on any new
high/critical finding; they are neither filtered nor ignored.

Puppeteer 25 and Lighthouse 13 remove the vulnerable `extract-zip` dependency;
Functions uses a matching modern Chromium family (153) and dynamic ESM import.
The offline renderer smoke exercises the actual packaged Linux Chromium in CI,
and the system browser on macOS. Existing Dependabot PRs are not merged or
closed automatically by these updates.
