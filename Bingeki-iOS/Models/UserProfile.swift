import Foundation

/// Mirrors `UserProfile` in `src/firebase/users.ts` (fields relevant to the
/// MVP only — social fields like `isAdmin`/friends stay server-side).
struct UserProfile: Codable, Hashable, Sendable {
    var uid: String
    var displayName: String?
    var photoURL: URL?

    var xp: Int = 0
    var level: Int = 1
    var totalXp: Int = 0
    var bonusXp: Int = 0
    var streak: Int = 0

    var totalChaptersRead: Int = 0
    var totalAnimeEpisodesWatched: Int = 0
    var totalMoviesWatched: Int = 0
    var totalWorksAdded: Int = 0
    var totalWorksCompleted: Int = 0

    // Hunter License personalization — §7/§9 of the handoff doc.
    var banner: String?
    var bannerPosition: String?
    var bio: String?
    var themeColor: String = "#FF2E63"
    var cardBgColor: String = "#0F1424"
    var borderColor: String = "#000000"
    var top3Favorites: [String] = []
    var featuredBadge: String?

    // Privacy / settings.
    var profileVisibility: ProfileVisibility = .public
    var showActivityStatus: Bool = true
    var hideScores: Bool = false
    var dataSaver: Bool = false
    var nsfwMode: Bool = false

    var xpToNextLevel: Int { GamificationCore.xpRequired(forLevel: level) }
    var rank: String { GamificationCore.rank(forLevel: level) }
}

enum ProfileVisibility: String, Codable, CaseIterable, Sendable {
    case `public`, friends, `private`

    var label: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Amis"
        case .private: return "Privé"
        }
    }
}

#if DEBUG
extension UserProfile {
    static let sample = UserProfile(
        uid: "preview-user",
        displayName: "Kaito",
        xp: 2340,
        level: 14,
        totalXp: 2340,
        streak: 12,
        totalChaptersRead: 1284,
        totalAnimeEpisodesWatched: 312,
        totalMoviesWatched: 9,
        totalWorksAdded: 77,
        totalWorksCompleted: 41,
        bio: "Shōnen le jour, seinen la nuit.",
        top3Favorites: [Work.sampleFrieren.id, Work.sampleOnePiece.id]
    )
}
#endif
