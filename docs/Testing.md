# Testing Strategy 🧪

Bingeki V2 follows a multi-layered testing strategy to ensure reliability, performance, and accessibility.

## 1. Unit & Integration Testing (Vitest)

We use **Vitest** for fast, concurrent execution of unit and integration tests.

-   **Command**: `npm test` or `npm run test:run`
-   **Config**: `vitest.config.ts`
-   **Environment**: `jsdom` (simulates a browser environment)
-   **Coverage**: `npm run test:coverage` (outputs to `coverage/`)

### Key Areas Tested:
*   **Utils**: Business logic, date formatting, and XP calculation.
*   **Hooks**: Custom React hooks ensuring state transitions are correct.
*   **Store**: Zustand stores and their persistence logic.
*   **Components**: Core UI atoms and complex layout blocks.

---

## 2. End-to-End Testing (Playwright)

**Playwright** is used to verify critical user flows in real browser environments.

-   **Command**: `npm run test:e2e`
-   **Interactive Mode**: `npm run test:e2e:ui`
-   **Config**: `playwright.config.ts`

### Critical Flows Verified:
*   **Authentication**: Login, signup, and session persistence.
*   **Library Management**: Adding/removing works, updating progress.
*   **PWA Install**: Ensuring the installation prompt appears and functions.
*   **Social**: Creating watch parties and sending friend requests.

---

## 3. Performance & Audit (Lighthouse CI)

We automate performance monitoring using **Lighthouse CI** to prevent regression in core web vitals.

-   **Command**: `npm run audit`
-   **Config**: `lighthouserc.json`
-   **Targets**:
    *   **Performance**: Min Score 0.7
    *   **Accessibility**: Min Score 0.8
    *   **Best Practices**: Min Score 0.8
    *   **SEO**: Min Score 0.8

---

## 4. Internationalization Validation

A custom script ensures that no translation keys are missing between supported locales.

-   **Command**: `npm run validate:i18n`
-   **Script**: `scripts/check-translations.ts`

---

## 🏗️ Writing New Tests

1.  **Unit Tests**: Create a file with `.test.ts` or `.test.tsx` next to the file being tested.
2.  **E2E Tests**: Add new test cases in the `tests/e2e/` directory.
3.  **Mocking Firebase**: Use the mocks provided in `src/test/setup.tsx` to simulate Firestore and Auth behaviors without making real network requests.
