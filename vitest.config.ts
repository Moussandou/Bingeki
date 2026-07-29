import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.tsx'],
        include: [
            'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            // Pure (network-free) Cloud Function helpers
            'functions/__tests__/**/*.{test,spec}.{js,mjs,cjs}',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/utils/**', 'src/store/**', 'src/hooks/**'],
            // Ratchet: set just under current actual coverage so the suite cannot
            // regress. Raise these as coverage improves — do not lower them.
            thresholds: {
                lines: 18,
                functions: 12,
                branches: 12,
                statements: 18,
            },
        },
    },
});
