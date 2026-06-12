import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Dedicated config for Firestore Security Rules tests.
 *
 * These run against the Firestore emulator and use the REAL firebase SDK, so they
 * must NOT load src/test/setup.tsx (which globally mocks firebase/firestore for the
 * jsdom unit tests). Hence a separate config: node environment, no setup mock,
 * and an include scoped to tests/rules/.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/rules/**/*.{test,spec}.ts'],
        // Rules tests share one emulator; keep them serial to avoid cross-test races.
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 30000,
    },
});
