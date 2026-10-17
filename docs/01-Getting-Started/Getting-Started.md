# Getting Started 🚀

This guide will help you set up **Bingeki V2** on your local machine for development.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js 22.19+** (CI and Functions use Node 22)
- **npm** (comes with Node.js)
- **Git**
- A **Firebase** account (for backend services)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Moussandou/Bingeki.git
   cd Bingeki
   ```

2. **Install dependencies**
   ```bash
   npm ci
   npm ci --prefix functions
   ```

3. **Environment Configuration**
   Duplicate the example environment file:
   ```bash
   cp .env.example .env
   ```

   Open `.env` and populate it with your Firebase configuration keys:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Running the App

Start the local development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

For isolated development, use `npm run dev:isolated` on port 5178 with the
committed demo-only `.env.isolated`. Start local Firebase services with
`bash scripts/start-emulators.sh "npm run dev:isolated"`; this never starts
scheduled Functions. Do not use a real project/account for test signups.
See [Testing](./Testing.md) for Java, browser installation and emulator details.

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with HMR. |
| `npm run build` | Validates Firebase config, compiles TypeScript, bundles and validates prerender output. |
| `npm run build:isolated` | Offline demo-only build for CI/local validation, never for production deployment. |
| `npm run lint` | Runs ESLint to check for code quality issues. |
| `npm run preview` | Previews the production build locally. |
