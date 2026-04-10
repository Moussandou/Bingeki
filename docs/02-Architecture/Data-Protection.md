# Data Protection & Sync Strategy 🛡️

Bingeki V2 uses a "Smart Sync" architecture to ensure user data remains consistent across multiple devices while preventing accidental loss or manipulation.

## 1. The Smart Merge Algorithm

When local data (Zustand) and cloud data (Firestore) differ, the system applies a non-destructive merging strategy located in `src/utils/dataProtection.ts`.

### Gamification Data Merge
- **Cumulative Stats**: For values like `totalXp`, `chaptersRead`, and `level`, the system **always picks the higher value** between local and cloud. This ensures progress is never reverted if a device syncs late.
- **Timestamps**: For transient states like `streak` and `lastActivityDate`, the system uses the most recent timestamp.
- **Badges**: The result is a **union** of both local and cloud badges, preserving the earliest `unlockedAt` timestamp for each.

### Library Data Merge
- **Individual Works**: Each work is compared by its `lastUpdated` timestamp. The most recent version wins.
- **Order Preservation**: The system prioritizes the **local array order** to respect the user's manual sorting, appending any new works found in the cloud to the end.

---

## 2. Validation & Security

To prevent data corruption or intentional manipulation (cheating), every write operation is validated via `validateGamificationWrite`.

### Regression Prevention
The system blocks any write attempt where cumulative stats (Level, Total XP, Count) are lower than the existing values in the database.

### Anti-Cheat Measures
- **Level Jumps**: A single save operation cannot increase the user's level by more than **10 levels**.
- **XP Thresholds**: Cumulative XP gains are capped at **25,000 XP** per sync to prevent bulk injection of artificial progress.

---

## 3. Disaster Recovery

Bingeki implements multi-layer backups to handle network failures or database errors:

1.  **Session Backup**: Every successful sync triggers `logDataBackup`, which stores a stringified version of the state in `sessionStorage` under the key `bingeki_backup_[type]_[userId]`.
2.  **Emergency Recovery**: If a critical error occurs during a session, the system can attempt to hydrate from this local backup before falling back to empty states.
3.  **Conflict Logging**: All merge decisions are logged to the internal logger with `[DataProtection]` prefix for audit purposes.
