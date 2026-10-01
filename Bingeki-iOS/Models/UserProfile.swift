import Foundation

/// Mirrors `UserProfile` in `src/firebase/users.ts` (fields relevant to the
/// MVP only — social fields like `isAdmin`/friends/`badges` stay
/// server-managed and are deliberately absent here, see
/// `FirebaseUserStore`'s doc comment on why writes must never `setDoc` this
/// whole struct).
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
    /// Read-only: server-managed by `onLibraryUpdate`, never in the write allowlist.
    var badges: [Badge] = []

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

// MARK: - Defensive decoding

extension UserProfile {
    private enum CodingKeys: String, CodingKey {
        case uid, displayName, photoURL, xp, level, totalXp, bonusXp, streak
        case totalChaptersRead, totalAnimeEpisodesWatched, totalMoviesWatched
        case totalWorksAdded, totalWorksCompleted
        case banner, bannerPosition, bio, themeColor, cardBgColor, borderColor
        case top3Favorites, featuredBadge, badges
        case profileVisibility, showActivityStatus, hideScores, dataSaver, nsfwMode
    }

    /// Every field but `uid` is read with `decodeIfPresent` + a fallback —
    /// a Firestore doc written by `saveUserProfileToFirestore`'s
    /// `allowedFields` allowlist on web can genuinely be missing any of
    /// these keys, and the synthesized `Decodable` would otherwise throw
    /// "key not found" on a non-Optional property even though it has a
    /// default value (defaults only help the memberwise initializer).
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        uid = try c.decode(String.self, forKey: .uid)
        displayName = try c.decodeIfPresent(String.self, forKey: .displayName)
        photoURL = try c.decodeIfPresent(URL.self, forKey: .photoURL)
        xp = try c.decodeIfPresent(Int.self, forKey: .xp) ?? 0
        level = try c.decodeIfPresent(Int.self, forKey: .level) ?? 1
        totalXp = try c.decodeIfPresent(Int.self, forKey: .totalXp) ?? 0
        bonusXp = try c.decodeIfPresent(Int.self, forKey: .bonusXp) ?? 0
        streak = try c.decodeIfPresent(Int.self, forKey: .streak) ?? 0
        totalChaptersRead = try c.decodeIfPresent(Int.self, forKey: .totalChaptersRead) ?? 0
        totalAnimeEpisodesWatched = try c.decodeIfPresent(Int.self, forKey: .totalAnimeEpisodesWatched) ?? 0
        totalMoviesWatched = try c.decodeIfPresent(Int.self, forKey: .totalMoviesWatched) ?? 0
        totalWorksAdded = try c.decodeIfPresent(Int.self, forKey: .totalWorksAdded) ?? 0
        totalWorksCompleted = try c.decodeIfPresent(Int.self, forKey: .totalWorksCompleted) ?? 0
        banner = try c.decodeIfPresent(String.self, forKey: .banner)
        bannerPosition = try c.decodeIfPresent(String.self, forKey: .bannerPosition)
        bio = try c.decodeIfPresent(String.self, forKey: .bio)
        themeColor = try c.decodeIfPresent(String.self, forKey: .themeColor) ?? "#FF2E63"
        cardBgColor = try c.decodeIfPresent(String.self, forKey: .cardBgColor) ?? "#0F1424"
        borderColor = try c.decodeIfPresent(String.self, forKey: .borderColor) ?? "#000000"
        top3Favorites = try c.decodeIfPresent([String].self, forKey: .top3Favorites) ?? []
        featuredBadge = try c.decodeIfPresent(String.self, forKey: .featuredBadge)
        badges = (try? c.decodeIfPresent([Badge].self, forKey: .badges)) ?? []
        profileVisibility = try c.decodeIfPresent(ProfileVisibility.self, forKey: .profileVisibility) ?? .public
        showActivityStatus = try c.decodeIfPresent(Bool.self, forKey: .showActivityStatus) ?? true
        hideScores = try c.decodeIfPresent(Bool.self, forKey: .hideScores) ?? false
        dataSaver = try c.decodeIfPresent(Bool.self, forKey: .dataSaver) ?? false
        nsfwMode = try c.decodeIfPresent(Bool.self, forKey: .nsfwMode) ?? false
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
