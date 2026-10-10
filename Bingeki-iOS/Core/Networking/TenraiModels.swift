import Foundation

/// DTOs for the Jikan v4 schema, as served by Tenrai. Field names match the
/// wire format (snake_case handled via `CodingKeys`), then get mapped onto
/// `Work` at the call site — see `TenraiMedia.asWork()`.

struct TenraiListResponse<T: Decodable & Sendable>: Decodable, Sendable {
    let data: [T]
    let pagination: TenraiPagination?
}

struct TenraiPagination: Decodable, Sendable {
    let hasNextPage: Bool
    let currentPage: Int?

    enum CodingKeys: String, CodingKey {
        case hasNextPage = "has_next_page"
        case currentPage = "current_page"
    }
}

struct TenraiDetailResponse: Decodable, Sendable {
    let data: TenraiMedia
    /// Everything else `/full` returns, decoded from the same payload (no extra request).
    let extras: TenraiFullExtras?

    enum CodingKeys: String, CodingKey { case data }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        data = try c.decode(TenraiMedia.self, forKey: .data)
        extras = try? c.decode(TenraiFullExtras.self, forKey: .data)
    }
}

/// Fields of `/{type}/{id}/full` used by the work page beyond `TenraiMedia`.
/// Every field is optional: anime and manga payloads differ, and a missing
/// field must never break the page.
struct TenraiFullExtras: Decodable, Sendable {
    let score: Double?
    let scoredBy: Int?
    let rank: Int?
    let popularity: Int?
    let members: Int?
    let favorites: Int?
    let status: String?
    let aired: TenraiDateRange?
    let published: TenraiDateRange?
    let season: String?
    let duration: String?
    let rating: String?
    let source: String?
    let studios: [TenraiNamed]?
    let authors: [TenraiNamed]?
    let serializations: [TenraiNamed]?
    let themes: [TenraiNamed]?
    let demographics: [TenraiNamed]?
    let relations: [TenraiRelation]?
    let theme: TenraiThemeSongs?
    let streaming: [TenraiLink]?

    enum CodingKeys: String, CodingKey {
        case score, rank, popularity, members, favorites, status, aired, published, season, duration, rating, source
        case studios, authors, serializations, themes, demographics, relations, theme, streaming
        case scoredBy = "scored_by"
    }
}

struct TenraiDateRange: Decodable, Sendable {
    /// Human-readable range as Jikan formats it, e.g. "Apr 5, 2009 to Jul 4, 2010".
    let string: String?
    let from: String?
    let to: String?
}

struct TenraiRelation: Decodable, Sendable {
    let relation: String
    let entry: [TenraiRelationEntry]
}

struct TenraiRelationEntry: Decodable, Sendable, Identifiable {
    let malId: Int
    let type: String
    let name: String

    var id: String { "\(type)-\(malId)" }

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case type, name
    }
}

struct TenraiThemeSongs: Decodable, Sendable {
    let openings: [String]?
    let endings: [String]?
}

struct TenraiLink: Decodable, Sendable {
    let name: String
    let url: URL?
}

// MARK: - Characters

struct TenraiCharacterRole: Decodable, Sendable, Identifiable {
    let character: TenraiCharacter
    let role: String?
    let voiceActors: [TenraiVoiceActor]?

    var id: Int { character.malId }

    enum CodingKeys: String, CodingKey {
        case character, role
        case voiceActors = "voice_actors"
    }
}

struct TenraiCharacter: Decodable, Sendable {
    let malId: Int
    let name: String
    let images: TenraiImages?

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case name, images
    }
}

struct TenraiVoiceActor: Decodable, Sendable {
    let person: TenraiStaffPerson
    let language: String?
}

// MARK: - Episodes

struct TenraiEpisode: Decodable, Sendable, Identifiable {
    let malId: Int
    let title: String?
    let aired: String?
    let filler: Bool?
    let recap: Bool?

    var id: Int { malId }

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case title, aired, filler, recap
    }
}

// MARK: - Statistics

struct TenraiStatisticsResponse: Decodable, Sendable {
    let data: TenraiStatistics
}

struct TenraiStatistics: Decodable, Sendable {
    /// `watching` for anime, `reading` for manga.
    let current: Int?
    let completed: Int?
    let onHold: Int?
    let dropped: Int?
    /// `plan_to_watch` for anime, `plan_to_read` for manga.
    let planned: Int?
    let total: Int?
    let scores: [TenraiScoreBucket]?

    enum CodingKeys: String, CodingKey {
        case watching, reading, completed, dropped, total, scores
        case onHold = "on_hold"
        case planToWatch = "plan_to_watch"
        case planToRead = "plan_to_read"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        current = try c.decodeIfPresent(Int.self, forKey: .watching) ?? c.decodeIfPresent(Int.self, forKey: .reading)
        completed = try c.decodeIfPresent(Int.self, forKey: .completed)
        onHold = try c.decodeIfPresent(Int.self, forKey: .onHold)
        dropped = try c.decodeIfPresent(Int.self, forKey: .dropped)
        planned = try c.decodeIfPresent(Int.self, forKey: .planToWatch) ?? c.decodeIfPresent(Int.self, forKey: .planToRead)
        total = try c.decodeIfPresent(Int.self, forKey: .total)
        scores = try c.decodeIfPresent([TenraiScoreBucket].self, forKey: .scores)
    }
}

struct TenraiScoreBucket: Decodable, Sendable {
    let score: Int
    let votes: Int
    let percentage: Double
}

struct TenraiRecommendationWrapper: Decodable, Sendable {
    let entry: TenraiMedia
    let votes: Int?
}

struct TenraiMedia: Decodable, Sendable, Identifiable {
    let malId: Int
    let title: String
    let titleEnglish: String?
    let titleJapanese: String?
    let type: String?
    let chapters: Int?
    let episodes: Int?
    let synopsis: String?
    let year: Int?
    let images: TenraiImages
    let genres: [TenraiNamed]?
    /// Anime only; absent from recommendation payloads (see `enrichVisibleCards`).
    let trailer: TenraiTrailer?

    var id: Int { malId }

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case title
        case titleEnglish = "title_english"
        case titleJapanese = "title_japanese"
        case type, chapters, episodes, synopsis, year, images, genres, trailer
    }
}

struct TenraiTrailer: Decodable, Sendable {
    let youtubeId: String?
    let embeddable: Bool?

    enum CodingKeys: String, CodingKey {
        case youtubeId = "youtube_id"
        case embeddable
    }
}

struct TenraiImages: Decodable, Sendable {
    let jpg: TenraiImageSet
}

struct TenraiImageSet: Decodable, Sendable {
    let imageUrl: URL?
    let largeImageUrl: URL?

    enum CodingKeys: String, CodingKey {
        case imageUrl = "image_url"
        case largeImageUrl = "large_image_url"
    }
}

struct TenraiNamed: Decodable, Sendable {
    let name: String
}

extension WorkType {
    var tenrai: TenraiMediaType { self == .anime ? .anime : .manga }
}

extension TenraiMedia {
    /// Maps a Tenrai/Jikan result onto the app's own `Work` model, defaulting
    /// to "not in library" state (`.planToRead`) — the caller decides the
    /// real status when merging with the user's existing library.
    func asWork(mediaType: TenraiMediaType) -> Work {
        Work(
            id: String(malId),
            title: title,
            titleEnglish: titleEnglish,
            titleJapanese: titleJapanese,
            image: images.jpg.largeImageUrl ?? images.jpg.imageUrl,
            imageSmall: images.jpg.imageUrl,
            type: mediaType == .anime ? .anime : .manga,
            format: type,
            totalChapters: chapters,
            totalEpisodes: episodes,
            status: .planToRead,
            synopsis: synopsis,
            genres: (genres ?? []).map(\.name),
            year: year,
            // Some uploads refuse embedding; those would only show an error.
            trailerYouTubeId: trailer?.embeddable == false ? nil : trailer?.youtubeId
        )
    }
}

// MARK: - Reviews, news, pictures, staff

struct TenraiReview: Decodable, Sendable, Identifiable {
    let malId: Int
    let url: URL?
    let date: String?
    let review: String
    let score: Int?
    let tags: [String]?
    let isSpoiler: Bool?
    let user: TenraiReviewUser

    var id: Int { malId }

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case url, date, review, score, tags, user
        case isSpoiler = "is_spoiler"
    }
}

struct TenraiReviewUser: Decodable, Sendable {
    let username: String
    let images: TenraiImages?
}

struct TenraiNews: Decodable, Sendable, Identifiable {
    let malId: Int
    let url: URL?
    let title: String
    let date: String?
    let excerpt: String?
    let comments: Int?
    let images: TenraiImages?

    var id: Int { malId }

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case url, title, date, excerpt, comments, images
    }
}

struct TenraiPicture: Decodable, Sendable {
    let jpg: TenraiImageSet
}

struct TenraiStaff: Decodable, Sendable, Identifiable {
    let person: TenraiStaffPerson
    let positions: [String]

    var id: Int { person.malId }
}

struct TenraiStaffPerson: Decodable, Sendable {
    let malId: Int
    let name: String
    let images: TenraiImages?

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case name, images
    }
}
