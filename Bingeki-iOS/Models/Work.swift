import Foundation

/// Mirrors `Work` in `src/store/libraryStore.ts` — keep the two in sync so
/// Firestore documents read/write identically from web and iOS. Custom
/// `Codable` (below, in an extension so the memberwise initializer used
/// throughout the app and previews still works) is required because the
/// wire format doesn't match a plain Swift `Codable` mapping: `id` is
/// `number | string` on web, `genres` is `{name: string}[]` not a plain
/// string array, and `lastUpdated`/`dateAdded` are epoch-milliseconds
/// numbers rather than ISO8601 strings.
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
    /// The user's own 1–10 rating (`rating` on web).
    var rating: Int?
    /// MyAnimeList community score copied in when the work was added
    /// (`score` on web, e.g. 8.62) — not the user's rating.
    var score: Double?
    var synopsis: String?
    var lastUpdated: Date?
    var dateAdded: Date?
    var collections: [String] = []
    var genres: [String] = []
    var season: String?
    var year: Int?

    /// Current progress for the type (episodes for anime, chapters for manga).
    var progress: Int { type == .anime ? currentEpisode : currentChapter }
    /// Nil when unknown — web stores 0 for ongoing series (One Piece…),
    /// which would otherwise cap progress at 0.
    var total: Int? {
        let value = type == .anime ? totalEpisodes : totalChapters
        return (value ?? 0) > 0 ? value : nil
    }

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

// MARK: - Cross-platform Firestore wire format

extension Work {
    private enum CodingKeys: String, CodingKey {
        case id, title
        case titleEnglish = "title_english"
        case titleJapanese = "title_japanese"
        case image
        case imageSmall = "image_small"
        case type, format
        case totalChapters, currentChapter, totalEpisodes, currentEpisode
        case status, rating, score, synopsis
        case lastUpdated, dateAdded
        case collections, genres, season, year
    }

    /// Web stores genres as `{ name: string }[]` (straight from the Jikan
    /// payload), not a plain string array.
    private struct GenreRef: Codable { var name: String }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)

        // `id` is `number | string` on web — accept either.
        if let stringId = try? c.decode(String.self, forKey: .id) {
            id = stringId
        } else if let intId = try? c.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = String(try c.decode(Double.self, forKey: .id))
        }

        title = try c.decode(String.self, forKey: .title)
        titleEnglish = try? c.decodeIfPresent(String.self, forKey: .titleEnglish)
        titleJapanese = try? c.decodeIfPresent(String.self, forKey: .titleJapanese)
        image = try? c.decodeIfPresent(URL.self, forKey: .image)
        imageSmall = try? c.decodeIfPresent(URL.self, forKey: .imageSmall)
        type = try c.decode(WorkType.self, forKey: .type)
        format = try? c.decodeIfPresent(String.self, forKey: .format)
        totalChapters = try? c.decodeIfPresent(Int.self, forKey: .totalChapters)
        currentChapter = (try? c.decodeIfPresent(Int.self, forKey: .currentChapter)) ?? 0
        totalEpisodes = try? c.decodeIfPresent(Int.self, forKey: .totalEpisodes)
        currentEpisode = (try? c.decodeIfPresent(Int.self, forKey: .currentEpisode)) ?? 0
        status = try c.decode(WorkStatus.self, forKey: .status)
        // Optional fields are decoded leniently: one odd value written by an
        // older web build must not make the whole work disappear on iOS.
        rating = (try? c.decodeIfPresent(Double.self, forKey: .rating)).map { Int($0.rounded()) }
        score = try? c.decodeIfPresent(Double.self, forKey: .score)
        synopsis = try? c.decodeIfPresent(String.self, forKey: .synopsis)

        // Epoch milliseconds (JS `Date.now()` convention), not ISO8601.
        if let ms = try? c.decodeIfPresent(Double.self, forKey: .lastUpdated) {
            lastUpdated = Date(timeIntervalSince1970: ms / 1000)
        } else {
            lastUpdated = nil
        }
        if let ms = try? c.decodeIfPresent(Double.self, forKey: .dateAdded) {
            dateAdded = Date(timeIntervalSince1970: ms / 1000)
        } else {
            dateAdded = nil
        }

        collections = (try? c.decodeIfPresent([String].self, forKey: .collections)) ?? []
        genres = ((try? c.decodeIfPresent([GenreRef].self, forKey: .genres)) ?? []).map(\.name)
        season = try? c.decodeIfPresent(String.self, forKey: .season)
        year = try? c.decodeIfPresent(Int.self, forKey: .year)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        // Encoded as a string; the web's `number | string` union accepts it.
        try c.encode(id, forKey: .id)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(titleEnglish, forKey: .titleEnglish)
        try c.encodeIfPresent(titleJapanese, forKey: .titleJapanese)
        try c.encodeIfPresent(image, forKey: .image)
        try c.encodeIfPresent(imageSmall, forKey: .imageSmall)
        try c.encode(type, forKey: .type)
        try c.encodeIfPresent(format, forKey: .format)
        try c.encodeIfPresent(totalChapters, forKey: .totalChapters)
        try c.encode(currentChapter, forKey: .currentChapter)
        try c.encodeIfPresent(totalEpisodes, forKey: .totalEpisodes)
        try c.encode(currentEpisode, forKey: .currentEpisode)
        try c.encode(status, forKey: .status)
        try c.encodeIfPresent(rating, forKey: .rating)
        try c.encodeIfPresent(score, forKey: .score)
        try c.encodeIfPresent(synopsis, forKey: .synopsis)
        if let lastUpdated { try c.encode(lastUpdated.timeIntervalSince1970 * 1000, forKey: .lastUpdated) }
        if let dateAdded { try c.encode(dateAdded.timeIntervalSince1970 * 1000, forKey: .dateAdded) }
        if !collections.isEmpty { try c.encode(collections, forKey: .collections) }
        if !genres.isEmpty { try c.encode(genres.map { GenreRef(name: $0) }, forKey: .genres) }
        try c.encodeIfPresent(season, forKey: .season)
        try c.encodeIfPresent(year, forKey: .year)
    }
}

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
