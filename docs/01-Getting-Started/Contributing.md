# Contributing Guide 🤝

Thank you for interest in contributing to Bingeki!

## Code Standards
We use **ESLint** and **Prettier** to enforce code style.
- **Run Check**: `npm run lint`
- **Auto Fix**: `npm run lint -- --fix`

### Styling
- Use **CSS Modules** (`styles.module.css`) for component-specific styles.
- Use **Global Variables** (`var(--color-...)`) for colors and fonts.
- **Do NOT** use inline styles for complex logic; use classes.

## Translation (i18n)
All user-facing text **MUST** be internationalized.
1.  **Key**: Add your key to `src/i18n.ts` in both `fr` and `en` objects.
2.  **Usage**:
    ```tsx
    const { t } = useTranslation();
    <span>{t('section.my_key')}</span>
    ```

## Git Flow
1.  **Branch**: Create a branch for your feature (`feat/my-feature`) or fix (`fix/bug-name`).
2.  **Commit**: Use conventional commits (e.g., `feat: add user profile`, `fix: header overflow`).
3.  **PR**: Open a Pull Request against `main`. Describe your changes and attach screenshots if UI related.

## Testing
Always verify that the build passes before pushing:
```bash
npm run build
```
