import Foundation

/// Client mirror of `src/shared/gamificationCore.ts`. Used only for
/// **optimistic** display (§9 of the handoff doc) — the Cloud Function
/// `onLibraryUpdate` remains the sole source of truth server-side; never
/// write these computed values back to Firestore directly.
enum GamificationCore {
    static let levelBase = 100
    static let levelMultiplier = 1.05
    static let maxLevel = 100

    enum XPReward {
        static let addWork = 15
        static let updateProgress = 5
        static let completeWork = 50
        static let watchMovie = 20
        static let dailyLogin = 25
    }

    /// XP required to go from `level` to `level + 1`.
    static func xpRequired(forLevel level: Int) -> Int {
        var requirement = Double(levelBase)
        for _ in 1..<max(level, 1) {
            requirement *= levelMultiplier
        }
        return Int(requirement.rounded())
    }

    static func cumulativeXP(forLevel level: Int) -> Int {
        var total = 0
        for l in 1..<max(level, 1) {
            total += xpRequired(forLevel: l)
        }
        return total
    }

    static func level(fromTotalXP totalXP: Int) -> (level: Int, xp: Int, xpToNextLevel: Int) {
        var level = 1
        var remaining = totalXP
        var requirement = xpRequired(forLevel: level)
        while remaining >= requirement, level < maxLevel {
            remaining -= requirement
            level += 1
            requirement = xpRequired(forLevel: level)
        }
        return (level, remaining, requirement)
    }

    /// Letter rank shown on the Hunter License — mirrors `src/utils/rankUtils.ts`.
    static func rank(forLevel level: Int) -> String {
        switch level {
        case 100...: return "臭"
        case 75..<100: return "S"
        case 50..<75: return "A"
        case 30..<50: return "B"
        case 20..<30: return "C"
        case 10..<20: return "D"
        case 5..<10: return "E"
        default: return "F"
        }
    }

    // MARK: - Daily streak (mirror of computeStreak / streakBonusXp on web)

    static let streakBonusPerDay = 5
    static let maxStreakBonus = 100
    static let maxBonusXP = 50_000

    /// Whole calendar days between two dates in the device's time zone —
    /// "yesterday at 23:59" and "today at 00:01" are 1 day apart.
    static func calendarDaysBetween(_ from: Date, _ to: Date, calendar: Calendar = .current) -> Int {
        let a = calendar.startOfDay(for: from)
        let b = calendar.startOfDay(for: to)
        return calendar.dateComponents([.day], from: a, to: b).day ?? 0
    }

    /// Same day: unchanged. Next day: +1. Any gap: back to 1.
    static func computeStreak(previous: Int, lastActivity: Date?, now: Date, calendar: Calendar = .current)
        -> (streak: Int, changed: Bool) {
        let prev = max(0, previous)
        guard let lastActivity else { return (1, true) }
        let days = calendarDaysBetween(lastActivity, now, calendar: calendar)
        if days <= 0 { return (max(prev, 1), false) }
        if days == 1 { return (prev + 1, true) }
        return (1, true)
    }

    /// +5 XP per consecutive day after the first, capped at +100.
    static func streakBonusXP(_ streak: Int) -> Int {
        guard streak > 1 else { return 0 }
        return min((streak - 1) * streakBonusPerDay, maxStreakBonus)
    }

    /// Profil Nen radar (6 axes, 0–100 each) — same normalization as the
    /// Profile board's `NenChart`.
    static func nenAxes(for profile: UserProfile) -> [(label: String, value: Double)] {
        [
            ("Niveau", min(Double(profile.level) * 2, 100)),
            ("Passion", min(Double(profile.xp) / 100, 100)),
            ("Assiduité", min(Double(profile.streak), 100)),
            ("Collection", min(Double(profile.totalWorksAdded) / 2, 100)),
            ("Lecture", min(Double(profile.totalChaptersRead) / 10, 100)),
            ("Complétion", min(Double(profile.totalWorksCompleted) * 5, 100)),
        ]
    }
}
