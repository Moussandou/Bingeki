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
}

struct TenraiRecommendationWrapper: Decodable, Sendable {
    let entry: TenraiMedia
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

    var id: Int { malId }

    enum CodingKeys: String, CodingKey {
        case malId = "mal_id"
        case title
        case titleEnglish = "title_english"
        case titleJapanese = "title_japanese"
        case type, chapters, episodes, synopsis, year, images, genres
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
            year: year
        )
    }
}
