import Foundation

/// Mirrors `Badge` / `BADGE_DEFINITIONS` in `src/shared/gamificationCore.ts`.
/// `icon` is a semantic key mapped to an SF Symbol in `BadgeIconView` —
/// never a raw emoji or Unicode glyph (icon policy set on the mockup canvas).
struct Badge: Identifiable, Codable, Hashable, Sendable {
    var id: String
    var name: String
    var description: String
    var icon: String
    var rarity: Rarity
    var unlockedAt: Date?
}

enum Rarity: String, Codable, Sendable {
    case common, rare, epic, legendary

    var color: BKColorToken {
        switch self {
        case .common: return .gray
        case .rare: return .cyan
        case .epic: return .purple
        case .legendary: return .gold
        }
    }
}

/// Literal accent colors that aren't theme-dependent (badge rarity, rank).
enum BKColorToken {
    case gray, cyan, purple, gold
}
