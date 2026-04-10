# Architecture & Tech Stack 🏗️

Bingeki V2 is designed as a high-performance, mobile-first Progressive Web App (PWA). The architecture prioritizes **speed**, **maintainability**, and a **"Brutalist Manga"** aesthetic.

## ⚛️ React Strategy

Bingeki uses **React 18** to leverage modern concurrent features while maintaining a lightweight footprint.

### Why React?
1.  **Component-Based Architecture**: Allows for reusable UI "Atoms" (Buttons, Inputs) and "Molecules" (ActionCards, Modals).
2.  **Ecosystem**: Native integration with **Framer Motion** for layout transitions and **React Router 7** for nested routing.
3.  **PWA Compatibility**: React's lifecycle methods and hooks (like `useEffect` and `useSyncExternalStore`) make it ideal for handling offline states and background sync.

### Pattern: Functional Components & Hooks
We exclusively use Functional Components with specialized custom hooks for side effects. For a detailed list of system hooks, see the [Hooks Reference](./Hooks.md).


```tsx
// Example of a data-fetching hook with Jikan API
export function useAnimeSearch(query: string) {
    const [results, setResults] = useState<Anime[]>([]);
    useEffect(() => {
        if (!query) return;
        const fetchAnime = async () => {
            const data = await jikanService.search(query);
            setResults(data);
        };
        fetchAnime();
    }, [query]);
    return results;
}
```

---

## 📦 State Management (Zustand)

We use **Zustand** for global state. It was chosen over Redux for its minimal boilerplate and superior performance with React's concurrent rendering.

### Persistence & Middleware
Most stores use the `persist` middleware to automatically sync state with `localStorage`.
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLibraryStore = create<LibraryState>()(
    persist(
        (set, get) => ({
            works: [],
            addWork: (work) => set((state) => ({
                works: [...state.works, { ...work, dateAdded: Date.now() }]
            })),
            getWork: (id) => get().works.find((w) => w.id === id),
        }),
        { name: 'bingeki-library-storage' }
    )
);
```

### Selector Pattern
To prevent unnecessary re-renders, always use selectors when consuming state:
```tsx
// ❌ Bad: Re-renders on any store change
const { works } = useLibraryStore();

// ✅ Good: Only re-renders if works array changes
const works = useLibraryStore(state => state.works);
```

### Data Integrity
Global state synchronization between local storage and Firestore is managed via a strict merging and validation layer. See [Data Protection & Sync Strategy](./Data-Protection.md) for more details.



---

## 🎨 Styling Architecture

Bingeki uses **Vanilla CSS** with **CSS Modules** and a **Global Token System**. This approach ensures maximum performance (zero-runtime CSS-in-JS) and prevents class name collisions.

### 1. Global Tokens (`tokens.css`)
We define all constants (colors, spacing, durations) as CSS Variables.
```css
:root {
  --color-primary: #FF2E63;
  --space-md: 1rem;
  --duration-fast: 0.2s;
}
```

### 2. CSS Modules
Each component has its own `.module.css` file.
```tsx
import styles from './Button.module.css';

export function Button({ children, variant = 'primary' }) {
    return (
        <button className={cn(styles.button, styles[variant])}>
            {children}
        </button>
    );
}
```

### 3. "Brutalist Manga" Implementation
The manga aesthetic is achieved via thick borders, solid shadows, and high-energy hover states defined in `manga-theme.css`.
```css
.manga-panel {
    border: 4px solid var(--color-border-heavy);
    box-shadow: 6px 6px 0px var(--color-shadow-solid);
    transition: transform var(--duration-fast) var(--ease-expo);
}
```

---

## 📁 Project Structure (Atomic Design Lite)

-   `src/components/ui/`: **Atoms** - Basic building blocks (Button, Input, Badge). No business logic.
-   `src/components/library/`: **Molecules/Organisms** - Domain-specific components (WorkCard, CollectionGrid).
-   `src/pages/`: **Templates/Pages** - Full page layouts and route entry points.
-   `src/store/`: **Global State** - Business logic and data persistence.
-   `src/services/`: **External APIs** - Pure functions for API calls (Jikan, Firestore).

---

## 💾 Performance & Caching Strategy

Bingeki employs a multi-layered caching system to ensure lightning-fast interactions and minimize expensive Cloud Function / Jikan API calls.

### 1. Layers of Cache
| Layer | Target | Technology | Persistence |
| :--- | :--- | :--- | :--- |
| **L1: Memory** | Client | In-memory `Map` | session only |
| **L2: LocalStorage** | Client | `bgk_c_` prefixed entries | persistent (expired by TTL) |
| **L3: Server Cache** | Cloud | Firestore `apiCache` collection | persistent (background sync) |

### 2. Request Deduplication (`inflight`)
To prevent duplicate concurrent calls (common in React StrictMode or navigation racing), the `animeApi` service uses an `inflight` Map. Concurrent requests for the same key will wait for the same Promise instead of spawning multiple network calls.

### 3. Smart LocalStorage Management
The service automatically manages `localStorage` quota. If a `QuotaExceededError` occurs, it identifies the oldest entry by timestamp, removes it, and retries the save operation.

---

## 🤖 SEO & Dynamic Metadata

Bingeki handles SEO via a specialized hybrid approach:

1.  **Dynamic Rendering**: A dedicated `seoHandler` Cloud Function intercepts requests.
2.  **Meta Injection**: It reads the database (Firestore) to inject relevant `og:title`, `og:description`, and `og:image` tags directly into the HTML.
3.  **Automatic OG Images**: A specialized endpoint (`/api/og-image`) generates on-the-fly SVG versions of Hunter Licenses and News cards for social sharing.

## 🚀 Performance Highlights

1.  **Hybrid Rendering**: Core shell is CSR (Client-Side Rendering) for speed, while `scripts/prerender.ts` generates static snapshots for SEO.
2.  **Edge Interception**: Firebase Cloud Functions (`seoHandler`) inject dynamic OG tags for social sharing.
3.  **Image Proxying**: Uses `wsrv.nl` for real-time resizing and WebP conversion.
4.  **Service Worker Caching**: Workbox rules in `vite.config.ts` cache MAL images with a `CacheFirst` strategy for 7 days.
