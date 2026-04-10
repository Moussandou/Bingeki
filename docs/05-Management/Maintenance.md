# Maintenance & Build Pipeline 🛠️

This document outlines the internal scripts and processes used to build, optimize, and maintain Bingeki V2.

## 1. Build Pipeline (`npm run build`)

The build process is a multi-step pipeline designed for performance and SEO:

1.  **`generate-sw`**: Generates the Firebase Messaging Service Worker (see below).
2.  **`tsc -b`**: Runs the TypeScript compiler to check for type errors.
3.  **`vite build`**: Bundles the application using Vite.
4.  **`localize-html`**: Creates language-specific HTML entry points (e.g., `index-en.html`).
5.  **`prerender`**: Generates static HTML for key routes to improve SEO (see below).

## 2. Service Worker Generation

Because Firebase Cloud Messaging (FCM) requires a `firebase-messaging-sw.js` file in the root, and we need to inject environment-specific API keys, we use a generation script.

*   **Template**: `public/firebase-messaging-sw.template.js`
*   **Script**: `scripts/generate-sw.ts`
*   **Output**: `public/firebase-messaging-sw.js` (Created/updated on every `npm run dev` or `npm run build`).

> [!IMPORTANT]
> Never edit `public/firebase-messaging-sw.js` directly. Changes will be overwritten. Edit the template instead.

## 3. Prerendering for SEO (`scripts/prerender.ts`)

Bingeki is a Single Page Application (SPA), but we use **Puppeteer** to generate static snapshots of critical pages so search engines can index them easily.

### How it works:
1.  Starts a temporary Express server to serve the `dist` folder.
2.  Launches a headless Chrome instance.
3.  Navigates to a list of predefined routes (Dashboard, Discover, News, etc.).
4.  Saves the fully rendered HTML into the `dist` folder (e.g., `/en/news` becomes `dist/en/news/index.html`).

### Adding New Routes to Prerender:
Update the `routes` array in `scripts/prerender.ts`.

## 4. Troubleshooting

### Build Fails on Prerendering
*   **Reason**: Usually a timeout or a JS error on the page that prevents the "DOM content loaded" event.
*   **Fix**: Check if the app runs locally without errors. Ensure all redirected routes (like `/`) are handled correctly in the script.

### Missing FCM Config in SW
*   **Reason**: Missing variables in your `.env` file.
*   **Fix**: Ensure all `VITE_FIREBASE_*` variables are present. The `generate-sw` script will warn you about missing keys.

### Local Development Tips
*   **Development Server**: `npm run dev` handles SW generation automatically.
*   **Testing Production Build**: `npm run preview` is essential to verify that prerendering and localization work as expected before deployment.
