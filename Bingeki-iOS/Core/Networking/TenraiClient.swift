import Foundation

/// Jikan is discontinued (closed 2026-10-01) — always use Tenrai, which
/// mirrors the Jikan v4 schema and paths. See project memory
/// "Tenrai, pas Jikan" and `src/services/animeApi.ts` on the web.
///
/// A Cloud Function fallback (`jikanProxy.*`, already deployed) is the
/// natural next step once Firebase is wired in Phase 1 — this direct client
/// is the fast path, matching the web's `jikanDirect()`.
actor TenraiClient {
    static let shared = TenraiClient(baseURL: URL(string: "https://api.tenrai.org/v1")!)

    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    enum ClientError: Error {
        case badStatus(Int)
        case decoding(Error)
    }

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: components.url!)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 10

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw ClientError.badStatus(status)
        }
        do {
            return try JSONDecoder.tenrai.decode(T.self, from: data)
        } catch {
            throw ClientError.decoding(error)
        }
    }

    func search(query: String, type: TenraiMediaType, page: Int = 1, limit: Int = 20) async throws -> TenraiListResponse<TenraiMedia> {
        try await get("/\(type.rawValue)", query: [
            .init(name: "q", value: query),
            .init(name: "page", value: String(page)),
            .init(name: "limit", value: String(limit)),
        ])
    }

    func topSeasonalAnime(limit: Int = 20) async throws -> TenraiListResponse<TenraiMedia> {
        try await get("/seasons/now", query: [.init(name: "limit", value: String(limit))])
    }

    func details(id: String, type: TenraiMediaType) async throws -> TenraiDetailResponse {
        try await get("/\(type.rawValue)/\(id)/full")
    }

    func recommendations(id: String, type: TenraiMediaType) async throws -> TenraiListResponse<TenraiRecommendationWrapper> {
        try await get("/\(type.rawValue)/\(id)/recommendations")
    }
}

enum TenraiMediaType: String, Sendable {
    case anime, manga
}

extension JSONDecoder {
    static let tenrai: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
