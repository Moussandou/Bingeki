# Deployment 🚀

Bingeki V2 uses a continuous deployment pipeline.

## Firebase Hosting
We host the SPA on Firebase Hosting, which provides global CDN and free SSL.

### Manual Deployment
If you have the Firebase CLI installed and permissions:

```bash
# 1. Build the project
npm run build

# 2. Deploy only hosting rules (safest)
firebase deploy --only hosting
```

## CI/CD Pipeline
We use **GitHub Actions** defined in `.github/workflows/deploy.yml`.

### Triggers
- **Push to `main`**: Automatically triggers Build -> Test -> Deploy.
- **Pull Request**: Triggers Build -> Lint -> Test (No Deploy).

### Environment Secrets
The GitHub repo must have the following Secrets configured for the pipeline to work:
- `FIREBASE_SERVICE_ACCOUNT_BINGEKI_V2` (JSON key)

## Versioning
We follow Semantic Versioning (Major.Minor.Patch).
- **Update**: Manually update `package.json` version before major releases.
- **Changelog**: Add a new entry to `src/i18n.ts` under `changelog.entries`.
