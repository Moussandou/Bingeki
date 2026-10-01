import FirebaseFirestore
import Foundation

/// `/users/{uid}/data/gamification` — the client owns exactly three fields
/// there (`bonusXp`, `streak`, `lastActivityDate`), the rules reject the
/// rest. Same contract as `recordActivity` + `saveGamificationToFirestore`
/// on the web: once per calendar day, bump the streak and grant the daily
/// login XP plus the streak bonus as `bonusXp`; `onGamificationUpdate` then
/// recomputes the profile's totals and the user store's listener shows them.
enum FirebaseGamificationStore {
    /// Records today's activity. Returns the streak after the update, or nil
    /// when nothing changed (already counted today) or the write failed.
    @discardableResult
    static func recordDailyActivity(uid: String, now: Date = .now) async -> Int? {
        let ref = Firestore.firestore().collection("users").document(uid)
            .collection("data").document("gamification")
        do {
            let snapshot = try await ref.getDocument(source: .server)
            let data = snapshot.data() ?? [:]
            let previous = (data["streak"] as? Int) ?? 0
            let bonus = (data["bonusXp"] as? Int) ?? 0
            let lastActivity = (data["lastActivityDate"] as? String).flatMap(Self.parseISO)

            let result = GamificationCore.computeStreak(previous: previous, lastActivity: lastActivity, now: now)
            guard result.changed else { return nil }

            let earned = GamificationCore.XPReward.dailyLogin + GamificationCore.streakBonusXP(result.streak)
            try await ref.setData([
                "streak": result.streak,
                "bonusXp": min(bonus + earned, GamificationCore.maxBonusXP),
                "lastActivityDate": Self.isoFormatter.string(from: now),
                "lastUpdated": now.timeIntervalSince1970 * 1000,
            ], merge: true)
            return result.streak
        } catch {
            // Offline: tomorrow's launch will catch up (a 1-day gap still counts).
            return nil
        }
    }

    // The web writes `new Date().toISOString()` (with milliseconds).
    nonisolated(unsafe) private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static func parseISO(_ string: String) -> Date? {
        if let date = isoFormatter.date(from: string) { return date }
        return ISO8601DateFormatter().date(from: string)
    }
}
