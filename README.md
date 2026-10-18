# Bingeki

![Build & Deploy](https://github.com/Moussandou/Bingeki/actions/workflows/deploy.yml/badge.svg)
![CI Status](https://github.com/Moussandou/Bingeki/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-AGPL--3.0-orange)

**Bingeki** is a French- and English-language progressive web app for tracking
anime and manga. Its library, discovery, seasonal releases, and community
features turn progress into an RPG-inspired experience with levels, XP,
streaks, and badges.

## Features

- Track anime and manga, organize a personal library, and sync across devices.
- Discover works, browse seasons and release schedules, and view detailed work
  and character pages.
- Earn XP, levels, streaks, and badges as you read and watch.
- Connect with friends, share activity, join watch parties, and create tier
  lists.
- Install the app as a PWA and use its mobile-friendly experience.
- Browse localized news and share profiles and works with search-friendly
  metadata.

## Quick start

**Requirements:** Node.js 22.19 or newer and npm.

```bash
git clone https://github.com/Moussandou/Bingeki.git
cd Bingeki
npm ci
cp .env.example .env
```

Add the Firebase web-app settings listed in `.env.example` to `.env`, then run:

```bash
npm run dev
```

The development server prints its local URL (usually `http://localhost:5173`).
Firebase emulators and Functions dependencies are only needed for the workflows
that use them; see the [development setup](docs/01-Getting-Started/Getting-Started.md).

For a demo-only build that uses Firebase emulators and does not require
production credentials, use `npm run build:isolated`. **Do not deploy its
output.**

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with hot reload. |
| `npm run lint` | Run ESLint. |
| `npm run validate:i18n` | Check French/English translation parity. |
| `npm run test:run` | Run unit and component tests once. |
| `npm run test:e2e` | Run Playwright browser tests. |
| `npm run build` | Type-check and build the production site; requires Firebase environment settings. |
| `npm run build:isolated` | Build and validate the offline demo configuration. |

See [Testing](docs/01-Getting-Started/Testing.md) for emulator, browser, and
validation details. Production deployment is documented in
[Deployment](docs/05-Management/Deployment.md).

## Documentation

- [Documentation index](docs/README.md)
- [Getting started](docs/01-Getting-Started/Getting-Started.md)
- [Architecture](docs/02-Architecture/Architecture.md)
- [Feature guides](docs/03-Features/)
- [Contributing](docs/01-Getting-Started/Contributing.md)

## Contributing

Contributions are welcome. Please read the
[contributing guide](docs/01-Getting-Started/Contributing.md) before opening a
pull request.

## License

Bingeki is distributed under the GNU Affero General Public License v3.0. See
[LICENSE](LICENSE) for details.
