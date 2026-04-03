# Admin Backoffice & Monitoring 🕵️‍♂️

Bingeki V2 includes a robust suite of administrative tools to monitor system health, manage users, and ensure data integrity.

## 1. Health Dashboard (`/admin/health`)

The **Health Dashboard** is the command center for platform stability.

### Real-time Diagnostics
-   **Infrastructure**: Monitoring connectivity and response times for Firebase Auth, Firestore, Storage, and the external Jikan API.
-   **API Queue**: Tracks the status of the throttled Jikan API queue (essential for MyAnimeList data syncing).
-   **Data Integrity Score**: A calculated 0-100 score based on missing profile fields across the user base.

### Self-Healing System (`healthChecks.ts`)
The "Manual Repair" feature performs a non-destructive scan of the database to:
1.  Assign temporary `displayName` if missing.
2.  Reset corrupted numeric fields (Level, XP, Total XP).
3.  Inject default Dicebear avatars for accounts without profile pictures.
4.  Log all changes in `admin_repair_history` for auditing.

### Discord Notifications
Administrators can configure a Discord Webhook to receive automated alerts when:
-   The overall system health score drops below 50.
-   Critical infrastructure (Auth/Database) is detected as "Down".

---

## 2. User & Content Management

### User Controls (`/admin/users`)
-   **Elevate/Demote**: Toggle the `isAdmin` flag.
-   **Sanctions**: Apply or lift `isBanned` status.
-   **Metrics**: View engagement rates (DAU/WAU/MAU) and level distributions.

### Feedback & Moderation (`/admin/feedback`)
Centralized queue for user reports, feature requests, and bug reports. Administrators can track the status of each item and respond to users.

### Social Generator (`/admin/social`)
A utility to generate branded social media assets and OpenGraph images directly from platform data (e.g., "Trending Anime of the Week").

---

## 3. System & Security Logs (`/admin/logs`)

We track high-sensitivity events in the `system_logs` collection:
*   Admin privilege escalations.
*   Mass data repairs.
*   Security breaches or unauthorized access attempts.
*   Maintenance mode toggles.

---

## 🛠️ Security for Backoffice
Only users with the `isAdmin: true` custom claim or Firestore document field can access `/admin/**` routes. This is enforced both via:
1.  **React Router Guards**: `AdminRoute` component.
2.  **Firestore Rules**: `allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;`
