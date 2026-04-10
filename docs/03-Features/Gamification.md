# Feature: Gamification 🎮

Bingeki's core differentiator is its RPG layer. Users don't just "consume" content; they "level up", earn badges, and compete on leaderboards.

## 1. XP & Leveling Logic

The leveling system uses a geometric progression to ensure that reaching higher levels becomes progressively more challenging.

### The Leveling Formula
- **Base XP (Level 1 → 2)**: 100 XP
- **Growth Multiplier**: 1.15x per level
- **Max Level**: 100
- **Formula**: `XP_Required = floor(100 * (1.15 ^ (Level - 1)))`

### XP Rewards Table
| Action | XP Amount | Notes |
| :--- | :--- | :--- |
| **Add Work** | 15 XP | One-time bonus when adding to library. |
| **Update Progress** | 5 XP | Granted per chapter/episode. |
| **Complete Work** | 50 XP | Bonus when status changes to 'Completed'. |
| **Daily Login** | 25 XP | Base reward once every 24 hours. |
| **Streak Bonus** | +5 XP / day | Max +100 XP (`min(100, (streak-1)*5)`). |

---

## 2. Streak Mechanics

The streak system rewards consistency but is forgiving to occasional life events.
- **48-Hour Window**: A streak is maintained if the user logs in within **48 hours** of their last activity.
- **Generous Continuity**: This window allows for a missed day without losing progress.
- **Scaling Bonus**: Each consecutive day adds +5 XP to the login reward, capping at +100 XP (Day 21+).

---

## 3. Nen Chart (Radar Chart)

A visual representation of a user's "hunter type", calculated dynamically:
- **Passion**: Based on Total XP.
- **Diligence**: Based on Login Streak.
- **Collection**: Number of works in library.
- **Reading**: Total chapters read.
- **Completion**: Number of completed works.

*Implemented using `Recharts` in `src/components/profile/CategoricalChart.tsx`.*

---

## 4. Badges & Validation

### Anti-Cheat
- **Known Totals**: Progress XP is **only** awarded if the work has a known total number of chapters/episodes.
- **Deterministic Recalculation**: The system periodically syncs the local state with the true work history to prevent drift.

### Badge Logic
- **Trigger**: Processed server-side via Firestore Cloud Functions.
- **Examples**: 
    - *Otaku*: Add 25 works.
    - *Binge Watcher*: Finish 10 Anime.
    - *Legendary Hunter*: Finish 100 works.
