import Foundation

/// Mirrors `Work` in `src/store/libraryStore.ts` — keep the two in sync so
/// Firestore documents read/write identically from web and iOS.
struct Work: Identifiable, Codable, Hashable, Sendable {
    var id: String
    var title: String
    var titleEnglish: String?
    var titleJapanese: String?
    var image: URL?
    var imageSmall: URL?
    var type: WorkType
    var format: String?
    var totalChapters: Int?
    var currentChapter: Int = 0
    var totalEpisodes: Int?
    var currentEpisode: Int = 0
    var status: WorkStatus
    var score: Int?
    var synopsis: String?
    var lastUpdated: Date?
    var dateAdded: Date?
    var collections: [String] = []
    var genres: [String] = []
    var season: String?
    var year: Int?

    /// Current progress for the type (episodes for anime, chapters for manga).
    var progress: Int { type == .anime ? currentEpisode : currentChapter }
    var total: Int? { type == .anime ? totalEpisodes : totalChapters }

    var progressFraction: Double {
        guard let total, total > 0 else { return 0 }
        return min(1, Double(progress) / Double(total))
    }

    mutating func incrementProgress(by delta: Int) {
        let newValue = max(0, progress + delta)
        let capped = total.map { min(newValue, $0) } ?? newValue
        if type == .anime { currentEpisode = capped } else { currentChapter = capped }
        lastUpdated = .now
        if delta > 0, status != .reading, status != .completed { status = .reading }
        if let total, capped >= total, delta > 0 { status = .completed }
    }
}

enum WorkType: String, Codable, Sendable {
    case anime, manga
}

enum WorkStatus: String, Codable, CaseIterable, Sendable {
    case reading
    case planToRead = "plan_to_read"
    case completed
    case onHold = "on_hold"
    case dropped
}

#if DEBUG
extension Work {
    static let sampleFrieren = Work(
        id: "154587",
        title: "Frieren — Saison 2",
        image: URL(string: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg"),
        type: .anime,
        totalEpisodes: 12,
        currentEpisode: 6,
        status: .reading,
        genres: ["Aventure", "Fantasy", "Tranche de vie"]
    )

    static let sampleOnePiece = Work(
        id: "30013",
        title: "One Piece",
        image: URL(string: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-BeslEMqiPhlk.jpg"),
        type: .manga,
        currentChapter: 1128,
        status: .reading
    )

    static let sampleLibrary: [Work] = [.sampleFrieren, .sampleOnePiece]
}
#endif
