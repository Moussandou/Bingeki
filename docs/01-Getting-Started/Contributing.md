# Contributing Guide 🤝

Thank you for interest in contributing to Bingeki!

## Code Standards
We use **ESLint** to enforce code quality and style.
- **Run Check**: `npm run lint`
- **Auto Fix**: `npm run lint -- --fix`

### Styling
- Use **CSS Modules** (`styles.module.css`) for component-specific styles.
- Use **Global Variables** (`var(--color-...)`) for colors and fonts.
- **Do NOT** use inline styles for complex logic; use classes.

## Translation (i18n)
All user-facing text **MUST** be internationalized.
1.  **Key**: Add matching keys to the appropriate namespace JSON files under
    `public/locales/fr/` and `public/locales/en/`.
2.  **Usage**:
    ```tsx
    const { t } = useTranslation();
    <span>{t('section.my_key')}</span>
    ```
3.  **Check**: Run `npm run validate:i18n` to check locale parity and statically
    used translation keys. See the
    [internationalization guide](./Internationalization.md) for namespaces.

## Git Flow
1.  **Branch**: Create a branch for your feature (`feat/my-feature`) or fix (`fix/bug-name`).
2.  **Commit**: Use conventional commits (e.g., `feat: add user profile`, `fix: header overflow`).
3.  **PR**: Open a Pull Request against `main`. Describe your changes and attach screenshots if UI related.

## Testing
Run the checks relevant to your change before pushing:
```bash
npm run lint
npm run validate:i18n
npm run test:run
```

The production build requires Firebase environment variables; use
`npm run build:isolated` for offline build validation. Browser and emulator
tests are described in the [testing guide](./Testing.md).
