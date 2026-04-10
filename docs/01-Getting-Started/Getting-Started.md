# Getting Started 🚀

This guide will help you set up **Bingeki V2** on your local machine for development.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Git**
- A **Firebase** account (for backend services)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Moussandou/Bingeki-V2.git
   cd Bingeki-V2
   ```

2. **Install dependencies**
   ```bash
   npm install
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

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with HMR. |
| `npm run build` | Compiles TypeScript and builds for production. |
| `npm run lint` | Runs ESLint to check for code quality issues. |
| `npm run preview` | Previews the production build locally. |
