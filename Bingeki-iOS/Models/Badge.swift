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

// MARK: - Web wire format

extension Badge {
    private enum CodingKeys: String, CodingKey {
        case id, name, description, icon, rarity, unlockedAt
    }

    /// Web stores `unlockedAt` as epoch ms and `icon` as a lucide name.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? id
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        icon = try c.decodeIfPresent(String.self, forKey: .icon) ?? "star"
        rarity = (try? c.decodeIfPresent(Rarity.self, forKey: .rarity)) ?? .common
        unlockedAt = (try? c.decodeIfPresent(Double.self, forKey: .unlockedAt)).map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(description, forKey: .description)
        try c.encode(icon, forKey: .icon)
        try c.encode(rarity, forKey: .rarity)
        if let unlockedAt { try c.encode(unlockedAt.timeIntervalSince1970 * 1000, forKey: .unlockedAt) }
    }

    /// Lucide icon name (web) → SF Symbol.
    var symbolName: String {
        switch icon {
        case "flag": return "flag.fill"
        case "book": return "book.closed.fill"
        case "book-open": return "book.fill"
        case "flame": return "flame.fill"
        case "zap": return "bolt.fill"
        case "library": return "books.vertical.fill"
        case "layers": return "square.stack.3d.up.fill"
        case "database": return "cylinder.split.1x2.fill"
        case "timer": return "timer"
        case "calendar-check": return "calendar.badge.checkmark"
        case "crown": return "crown.fill"
        case "check-circle": return "checkmark.circle.fill"
        case "target": return "target"
        case "medal": return "medal.fill"
        case "award": return "rosette"
        case "trophy": return "trophy.fill"
        default: return "star.fill"
        }
    }
}

extension Rarity {
    var label: String {
        switch self {
        case .common: return "COMMUN"
        case .rare: return "RARE"
        case .epic: return "ÉPIQUE"
        case .legendary: return "LÉGENDAIRE"
        }
    }
}
