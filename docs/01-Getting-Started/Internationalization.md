# Internationalization (i18n) 🌍

Bingeki is designed to be a global platform, currently supporting **French (FR)** and **English (EN)**.

## 1. Technical Stack
*   **Engine**: [i18next](https://www.i18next.com/) & [react-i18next](https://react.i18next.com/).
*   **Configuration**: Centralized in `src/i18n.ts`.
*   **Detection**: Automatically detects user language via `i18next-browser-languagedetector`.

## 2. Translation Workflow

### Adding New Keys
1.  Open `src/i18n.ts`.
2.  Add the key in the `fr.translation` object.
3.  Add the equivalent key in the `en.translation` object.
4.  Use the `t()` hook in your component:
    ```tsx
    const { t } = useTranslation();
    return <h1>{t('header.dashboard')}</h1>;
    ```

### Validation Script
We use a custom script to ensure consistency between locales and avoid "missing key" errors in production.

**Run the validation:**
```bash
npm run validate:i18n
```
This script (`scripts/check-translations.ts`) will:
1.  Verify that every key in `fr` has an equivalent in `en` (and vice-versa).
2.  Scan the `src/` directory for `t('...')` calls to ensure every key used in the code is actually defined.
3.  Report unused keys that could be pruned.

## 3. SEO & Build-time Localization

Because Bingeki uses prerendering for SEO, we generate language-specific entry points during the build process.

*   `scripts/localize-html.cjs`: A post-build script that clones `dist/index.html` into `dist/index-en.html`, replacing meta tags, titles, and descriptions with their English equivalents.
*   **Note**: Ensure that any changes to the default `index.html` (French) are reflected in this script if they impact the English version.

## 4. Best Practices
*   **Avoid Dynamic Keys**: Avoid `t(`badge_${id}`)` where possible, as the validation script cannot easily track these. If you must use them, document them.
*   **Interpolation**: Use the standard `{{variable}}` syntax.
    *   Example: `t('player_rank', { rank: 1 })`
*   **Formatting**: Keep keys descriptive and nested (e.g., `profile.edit_modal.title`).
