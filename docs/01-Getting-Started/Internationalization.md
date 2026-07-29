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

## 4. Dynamic Content Translation (Cloud Function)

Static UI strings live in the locale files above. **Dynamic** content pulled from external
sources — work synopses, character bios, news titles and bodies — is English-only at the
source and is translated automatically at runtime.

### How it works

1.  A component calls `useTranslationData(text, sourceId, sourceType, sourceField, lang)`
    (`src/services/translationService.ts`).
2.  If the viewer is signed in, the hook writes a **request document** to
    `translations/{type}_{id}_{field}` containing the source `input`.
    Security rules let clients write the request metadata but **never** the rendered
    payload (`translated`, `translatedInput`, `translatedAt`).
3.  The `onTranslationRequest` Cloud Function (`functions/translate.js`) picks it up,
    translates, and writes `translated` back via the Admin SDK.
4.  The hook is subscribed with `onSnapshot`, so the UI swaps in the translation live.
    Results are cached in Firestore forever and served to **all** visitors, guests included.

### Providers (free, no API key, no billing)

Tried in order, controlled by `TRANSLATE_PROVIDER_ORDER` (default `google,mymemory`):

| Provider | Limit | Notes |
| --- | --- | --- |
| `google` | ~1 800 chars/request | The endpoint the public translate widget uses. No key. Unofficial, hence the fallback. |
| `mymemory` | 500 chars/request, 5 000 chars/day/IP | Documented free tier. Set `MYMEMORY_EMAIL` (free signup) to raise the daily cap to 50 000. |

Long text is chunked on sentence boundaries to respect these limits. A provider is only
accepted if it translates **every** chunk, so a half-English result is never stored.

### HTML safety

News bodies are HTML. `splitHtmlSegments()` sends only text nodes to the providers and
keeps tags byte-for-byte, and `preserveEdgeWhitespace()` restores the spaces providers trim
(without it, `The <strong>` collapses into `Le<strong>`). Output is still passed through
`DOMPurify` client-side before rendering.

> **Known limitation**: text split by *inline* tags is translated fragment by fragment, so
> grammar around `<strong>`/`<a>` can be imperfect. Block-level content and plain-text
> synopses — the main use case — are unaffected.

### Loop safety

The trigger writes to the document it watches. `missingLanguages()` returns an empty array
once `translatedInput === input` and the payload is present, so the re-trigger exits
immediately. This is covered by `functions/__tests__/translateCore.test.js` and verified
end-to-end against the emulators (exactly two writes: the request, then the fill).

### Adding a target language

Add it to `TARGET_LANGS` in `functions/translate.js` and redeploy — existing documents are
re-processed automatically because the new language shows up as missing.

## 5. Best Practices
*   **Avoid Dynamic Keys**: Avoid `t(`badge_${id}`)` where possible, as the validation script cannot easily track these. If you must use them, document them.
*   **Interpolation**: Use the standard `{{variable}}` syntax.
    *   Example: `t('player_rank', { rank: 1 })`
*   **Formatting**: Keep keys descriptive and nested (e.g., `profile.edit_modal.title`).
