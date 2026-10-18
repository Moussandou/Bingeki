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
| `npm run test:prerender` | Built snapshots without JavaScript, ordinary mobile startup, consent and viewport-loaded home chart; local requests only |
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
Functions or use `.firebaserc`'s real default project. Each worktree keeps emulator
temporary blobs under its ignored `.firebase/emulator-tmp`, avoiding collisions
with concurrent worktrees. Playwright uses port 5178,
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

Prerender checks actual visible application content, a heading, language, title and
browser exceptions, not the size of the static HTML shell. Failed routes fail
the build; output is written only after all routes succeed. The manifest covers
43 entries, including current `/releases` and legacy schedule/season aliases;
the unfinished Challenges placeholder is deliberately not prerendered.
Offline builds block external requests and do not require catalog services.
Snapshots inline only their route's compiled CSS, normalize build-server asset
URLs, and retain only the original entry's module preloads. Runtime-added preloads
must not turn account services or lazy charts into eager downloads. Inter and
Outfit are self-hosted, with early font preloads and `font-display: swap`.
Initial client rendering waits for its translations and public page module,
not a timer; account synchronization starts independently. Public informational
pages also render without waiting for account services on non-prerendered
navigation. The ownership guard remains unconditional, private routes retain
their authentication loading gate, and a received maintenance flag still takes
precedence. The home radar chart uses the same renderer and reserved
height, loading when it approaches the viewport.
`npm run test:seo -- --base-url http://localhost:PORT` checks a running server;
without an explicit base URL it targets the public site (read-only).

## CI guarantees and limits

CI blocks on lint, translation parity, coverage thresholds, root/Functions
audits at **all severities**, isolated build, built-page browser regressions,
renderer smoke, rules and browser tests. Lighthouse runs three times per mobile
URL (`/fr/privacy`, `/en/privacy`, `/fr`). The median performance floor is now a
blocking 0.7 (previously a warning at the same score), with a blocking median
FCP budget of 3500 ms and CLS budget of 0.1. Built-page browser regressions
separately reject uncaught application/startup errors.
Accessibility/best-practices/SEO retain their 0.8 warning thresholds. Reports
stay in private workflow artifacts, not temporary public storage. Neither
coverage thresholds nor existing score floors are reduced.

Root dependencies (including development tooling) and Functions audit clean.
The five moderate audit entries formerly in
`@lhci/cli -> @lhci/utils -> js-yaml@3 -> argparse -> sprintf-js`
([GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)):
unbounded precision format strings could cause denial of service. A scoped
override replaces only `js-yaml@3`'s `argparse` dependency with 2.0.1, removing
`sprintf-js`; js-yaml remains on 3.15.2 and preserves LHCI's `safeLoad` API.
The regression exercises LHCI YAML loading and js-yaml's real CLI (file parsing,
help and invalid arguments), in addition to actual LHCI autorun. Root clean
installs were checked with Node 22 / npm 10 and npm 11 without lockfile changes.
There are no audit exceptions, `--omit=dev` exclusions or LHCI downgrades.

### Measured performance, 2026-10-19

Local before/after reports use Node 22.23.3, Chrome 155.0.0.0 and Lighthouse
13.5.0, the same LHCI static server, three cold runs per route, default simulated
mobile throttling (150 ms RTT, 1638.4 Kbps throughput, 4x CPU slowdown, 412 x 823).
Baseline source: `230fde7`; final source also includes the subsequently merged
community feature from main. These are local isolated builds, **not production
measurements**. Values below are medians; FCP/LCP/TBT are milliseconds.

| Route | Before scores | After scores | Median score before → after | FCP before → after | LCP before → after | TBT before → after | After CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/fr/privacy` | 57, 59, 62 | 75, 74, 76 | 59 → 75 | 6544 → 2613 | 9259 → 3228 | 149 → 551 | 0 |
| `/en/privacy` | 59, 58, 58 | 78, 75, 74 | 58 → 75 | 6567 → 2615 | 9650 → 3587 | 97 → 465 | 0 |
| `/fr` | 57, 57, 56 | 71, 58, 73 | 57 → 71 | 6639 → 2692 | 9765 → 3393 | 167 → 574 | 0 |

**90/100 is not achieved.** The remaining cost is now dominated by JavaScript
execution/account-service initialization rather than invisible snapshots and
render-blocking remote fonts. TBT is higher in this final sample, and the home
run at 58 demonstrates variance; do not present the faster pilot runs as the
final result. Authentication, maintenance handling, consent, backend requests
and rendering are not disabled for Lighthouse. Production needs its own
post-deployment comparison using the same measurement command.

Puppeteer 25 and Lighthouse 13 remove the vulnerable `extract-zip` dependency;
Functions uses a matching modern Chromium family (153) and dynamic ESM import.
The offline renderer smoke exercises the actual packaged Linux Chromium in CI,
and the system browser on macOS. Existing Dependabot PRs are not merged or
closed automatically by these updates.
