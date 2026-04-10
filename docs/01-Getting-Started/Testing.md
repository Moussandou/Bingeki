# Testing Strategy 🧪

Bingeki V2 employs a multi-layered testing strategy to ensure reliability across global state, UI components, and critical user journeys.

## 1. Unit Testing (Vitest)

We use **Vitest** for testing "pure" logic, such as Zustand stores and utility functions.

### Example: Zustand Store Test
Testing the `gamificationStore.ts` ensures that XP calculations and level-ups are deterministic.
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGamificationStore } from './gamificationStore';

describe('Gamification Store', () => {
    beforeEach(() => {
        useGamificationStore.getState().resetStore();
    });

    it('should add XP and level up correctly', () => {
        const { addXp } = useGamificationStore.getState();
        
        // Level 1 -> Level 2 requires 100 XP
        addXp(100);
        
        const state = useGamificationStore.getState();
        expect(state.level).toBe(2);
        expect(state.xp).toBe(0);
        expect(state.totalXp).toBe(100);
    });
});
```

---

## 2. Component Testing (React Testing Library)

Integrated with Vitest, **RTL** is used to test how components render and interact with the user, mocking the necessary stores.

### Example: Header Component
Testing conditional rendering based on authentication state.
```tsx
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/store/authStore');

it('renders login button for guest users', () => {
    // Mocking the store return value
    (useAuthStore as any).mockReturnValue({
        user: null,
        userProfile: null,
    });

    render(<Header />);
    expect(screen.getByText('header.login')).toBeInTheDocument();
});
```

---

## 3. End-to-End (E2E) Testing (Playwright)

We use **Playwright** to simulate real browser interactions on the production build.

### Core Flows Tested:
- **Authentication**: Login, Logout, and Protected Routes.
- **Library Management**: Adding/Removing titles from the collection.
- **PWA Features**: Offline mode and manifest validity.

### Example: Critical Path Spec
```typescript
import { test, expect } from '@playwright/test';

test('User can add a manga to their library', async ({ page }) => {
    await page.goto('/en/discover');
    
    // Search for a title
    await page.fill('input[placeholder*="Search"]', 'One Piece');
    await page.press('input', 'Enter');
    
    // Click the "Add" button on the first result
    await page.click('button:has-text("Add")');
    
    // Verify it appears in the library
    await page.goto('/en/library');
    await expect(page.locator('text=One Piece')).toBeVisible();
});
```

---

## 4. Performance & SEO Audits

Every Pull Request undergoes automated audits via **GitHub Actions**:
1.  **Lighthouse**: Audits for Performance (90+), Accessibility (100), and SEO (100).
2.  **Trivy**: Scours dependencies for security vulnerabilities.
3.  **i18n Validation**: Ensures no missing translation keys in `fr.json` vs `en.json`.

## 🚀 Running Tests

| Command | Purpose |
| :--- | :--- |
| `npm run test` | Run Vitest unit & component tests (Store, Services, Utils). |
| `npm run test:ui` | Open Vitest interactive UI. |
| `npm run e2e` | Run Playwright E2E tests (requires `npm run build`). |
| `npm run audit` | Run full build, lint, and type-check suite. |
