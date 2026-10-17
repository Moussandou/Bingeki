# Deployment

`.github/workflows/deploy.yml` runs on pushes to `main`. Its production job
depends on the reusable CI and security workflows for the **same commit**:
lint, translation parity, coverage, dependency audits, isolated prerender,
renderer smoke, emulator rules, Playwright and verified-secret scanning must
succeed first. Pull requests run validation without deployment. Daily emulator
validation and weekly security scans also run independently.

Production jobs are serialized without interrupting an active Firebase deploy.
Immediately before deployment, the job refuses any SHA superseded on `main`,
so a slower validation of an older commit cannot publish over a newer release.

Use Node 22.19+ locally; CI resolves the maintained Node 22 release. Functions
targets Node 22. Never replace the isolated CI configuration with production
credentials to make tests pass.

## Production configuration

The build needs repository secrets `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` and
`VITE_FIREBASE_APP_ID`; `VITE_FIREBASE_MEASUREMENT_ID` is optional.
The deploy service account secret is **`FIREBASE_SERVICE_ACCOUNT_BINGEKI`**
(JSON), not the obsolete `_V2` name. Client Firebase configuration is public;
the service account must never appear in Vite variables or committed files.

Production builds fail on missing configuration, browser exceptions or empty
prerender content. Production deployment installs Functions dependencies and
uses Firebase CLI **15.34.0** for Firestore rules/indexes, Storage rules,
Functions and Hosting. A nonzero CLI exit fails the job, including partial
deployments; it is never converted into success by matching a log message.
The service-account file is private and removed on exit.
Predeploy copies HTML shells, shared route metadata and `shared/seo/csp.cjs`
into Functions. Hosting and HTML Functions use the same CSP, enforced by a
regression test; SVG responses have a separate restrictive policy.

## Manual deployment

Only an authorized maintainer should deploy. `hosting` publishes the site; it
does **not** deploy Firestore or Storage security rules.

```bash
npm ci
npm ci --prefix functions
npm run lint
npm run validate:i18n
npm run test:coverage
npm audit --audit-level=high
npm audit --prefix functions --audit-level=high
bash scripts/start-emulators.sh "npm run test:emulator && npm run test:e2e"
npm run build
# Explicitly review the project and deployment scope before executing:
npx --yes --package=firebase-tools@15.34.0 -- firebase deploy --project bingeki --only firestore:rules,firestore:indexes,storage,functions,hosting
```

CI uses a dedicated demo configuration for testing and real configuration only
for the gated production build. Do not deploy `dist` from `build:isolated`.
See [Testing](../01-Getting-Started/Testing.md) for residual moderate tooling
advisories and Lighthouse's advisory score thresholds.
