import FirebaseCore
import FirebaseFunctions
import Foundation

/// Jikan is discontinued (closed 2026-10-01) — always use Tenrai, which
/// mirrors the Jikan v4 schema and paths. See project memory
/// "Tenrai, pas Jikan" and `src/services/animeApi.ts` on the web.
///
/// Direct call first (fast path, the web's `jikanDirect()`), then the
/// already-deployed `jikanProxy.*` Cloud Functions when Tenrai is down,
/// rate-limiting or blocking the device's network — same direct→proxy
/// order as the web.
actor TenraiClient {
    static let shared = TenraiClient(baseURL: URL(string: "https://api.tenrai.org/v1")!, session: defaultSession)

    private static var defaultSession: URLSession {
        #if DEBUG
        // `-bk.forceOffline YES`: every request fails like airplane mode.
        if UserDefaults.standard.bool(forKey: "bk.forceOffline") {
            let config = URLSessionConfiguration.ephemeral
            config.protocolClasses = [AirplaneModeProtocol.self]
            return URLSession(configuration: config)
        }
        #endif
        return .shared
    }

    private let baseURL: URL
    private let session: URLSession
    private let cache: ResponseCache?

    init(baseURL: URL, session: URLSession = .shared, cache: ResponseCache? = .shared) {
        self.baseURL = baseURL
        self.session = session
        self.cache = cache
    }

    enum ClientError: Error {
        case badStatus(Int)
        case decoding(Error)
    }

    /// The Cloud Function equivalent of a direct path. `wrapsData` is true
    /// for callables that return Jikan's `data` payload unwrapped (the
    /// response types here expect the `{ "data": … }` envelope).
    struct ProxyCall: Sendable {
        var name: String
        var payload: [String: any Sendable]
        var wrapsData: Bool
    }

    /// Direct → proxy → last good copy on disk. Every successful payload is
    /// stored (raw, before decoding) so the next offline launch has it.
    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = [], proxy: ProxyCall? = nil) async throws -> T {
        let key = Self.cacheKey(path, query)
        let data: Data
        do {
            data = try await fetch(path, query: query, proxy: proxy)
        } catch {
            guard Self.shouldFallBack(on: error), let cached = await cache?.data(for: key) else { throw error }
            return try Self.decode(cached)
        }
        let value: T = try Self.decode(data)
        await cache?.store(data, for: key)
        return value
    }

    private func fetch(_ path: String, query: [URLQueryItem], proxy: ProxyCall?) async throws -> Data {
        do {
            return try await direct(path, query: query)
        } catch {
            // No network at all: the proxy would only time out too.
            guard let proxy, Self.shouldFallBack(on: error), !Self.isOffline(error) else { throw error }
            return try await Self.callProxy(proxy)
        }
    }

    private static func decode<T: Decodable>(_ data: Data) throws -> T {
        do {
            return try JSONDecoder.tenrai.decode(T.self, from: data)
        } catch {
            throw ClientError.decoding(error)
        }
    }

    /// Path plus sorted query, so parameter order doesn't split entries.
    static func cacheKey(_ path: String, _ query: [URLQueryItem]) -> String {
        let items = query.map { "\($0.name)=\($0.value ?? "")" }.sorted().joined(separator: "&")
        return items.isEmpty ? path : "\(path)?\(items)"
    }

    private static func isOffline(_ error: Error) -> Bool {
        guard let urlError = error as? URLError else { return false }
        return [.notConnectedToInternet, .networkConnectionLost, .dataNotAllowed, .internationalRoamingOff]
            .contains(urlError.code)
    }

    /// Network failures and server-side refusals go to the proxy (then the
    /// disk copy); a decoding error would fail the same way, so it doesn't.
    private static func shouldFallBack(on error: Error) -> Bool {
        if error is URLError { return true }
        // Firebase callable errors (offline, deadline, unavailable).
        if (error as NSError).domain == FunctionsErrorDomain { return true }
        if case ClientError.badStatus(let status) = error {
            return status == -1 || status == 403 || status == 429 || status >= 500
        }
        return false
    }

    private static func callProxy(_ proxy: ProxyCall) async throws -> Data {
        // Demo/mock launches skip FirebaseApp.configure(); Functions would trap.
        guard FirebaseApp.app() != nil else { throw ClientError.badStatus(-1) }
        func plain(_ dict: [String: any Sendable]) -> [String: Any] {
            dict.mapValues { value -> Any in
                if let nested = value as? [String: any Sendable] { return plain(nested) }
                return value
            }
        }
        let payload = plain(proxy.payload)
        let result = try await Functions.functions(region: "europe-west9")
            .httpsCallable(proxy.name)
            .call(payload)
        let body: Any = proxy.wrapsData ? ["data": result.data] : result.data
        return try JSONSerialization.data(withJSONObject: body)
    }

    private func direct(_ path: String, query: [URLQueryItem]) async throws -> Data {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: components.url!)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 10

        var (data, response) = try await session.data(for: request)
        // Jikan-style rate limit (~3 req/s): one retry after a short pause.
        if (response as? HTTPURLResponse)?.statusCode == 429 {
            try await Task.sleep(for: .milliseconds(1200))
            (data, response) = try await session.data(for: request)
        }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw ClientError.badStatus(status)
        }
        return data
    }

    // `sfw` mirrors the web: adult titles hidden unless the user enabled 18+.
    private func sfwItem(_ sfw: Bool) -> [URLQueryItem] {
        sfw ? [.init(name: "sfw", value: "true")] : []
    }

    // `nsfwMode` on proxy calls is only a request: the function re-checks
    // the caller's Firestore profile before honouring it.

    func search(query: String, type: TenraiMediaType, page: Int = 1, limit: Int = 20, sfw: Bool = true) async throws -> TenraiListResponse<TenraiMedia> {
        try await get("/\(type.rawValue)", query: [
            .init(name: "q", value: query),
            .init(name: "page", value: String(page)),
            .init(name: "limit", value: String(limit)),
        ] + sfwItem(sfw), proxy: ProxyCall(name: "searchWorks", payload: [
            "query": query, "type": type.rawValue, "page": page,
            "filters": ["limit": limit], "nsfwMode": !sfw,
        ], wrapsData: false))
    }

    func topSeasonalAnime(limit: Int = 20, page: Int = 1, sfw: Bool = true) async throws -> TenraiListResponse<TenraiMedia> {
        try await get("/seasons/now", query: [
            .init(name: "limit", value: String(limit)),
            .init(name: "page", value: String(page)),
        ] + sfwItem(sfw), proxy: page == 1
            ? ProxyCall(name: "getSeasonalAnime", payload: ["limit": limit, "nsfwMode": !sfw], wrapsData: true)
            : nil)
    }

    func top(type: TenraiMediaType, limit: Int = 24, page: Int = 1, sfw: Bool = true) async throws -> TenraiListResponse<TenraiMedia> {
        try await get("/top/\(type.rawValue)", query: [
            .init(name: "limit", value: String(limit)),
            .init(name: "page", value: String(page)),
        ] + sfwItem(sfw), proxy: page == 1
            ? ProxyCall(name: "getTopWorks", payload: ["type": type.rawValue, "limit": limit, "nsfwMode": !sfw], wrapsData: true)
            : nil)
    }

    /// Most popular titles of a Jikan genre id (e.g. 27 = Shounen).
    func byGenre(_ genreId: Int, type: TenraiMediaType, limit: Int = 24, page: Int = 1, sfw: Bool = true) async throws -> TenraiListResponse<TenraiMedia> {
        try await get("/\(type.rawValue)", query: [
            .init(name: "genres", value: String(genreId)),
            .init(name: "order_by", value: "members"),
            .init(name: "sort", value: "desc"),
            .init(name: "limit", value: String(limit)),
            .init(name: "page", value: String(page)),
        ] + sfwItem(sfw), proxy: ProxyCall(name: "searchWorks", payload: [
            "type": type.rawValue, "page": page, "nsfwMode": !sfw,
            "filters": ["genres": String(genreId), "order_by": "members", "sort": "desc", "limit": limit] as [String: any Sendable],
        ], wrapsData: false))
    }

    func details(id: String, type: TenraiMediaType) async throws -> TenraiDetailResponse {
        try await get("/\(type.rawValue)/\(id)/full",
                      proxy: ProxyCall(name: "getWorkDetails", payload: ["id": id, "type": type.rawValue], wrapsData: true))
    }

    func characters(id: String, type: TenraiMediaType) async throws -> TenraiListResponse<TenraiCharacterRole> {
        try await get("/\(type.rawValue)/\(id)/characters",
                      proxy: ProxyCall(name: "getWorkCharacters", payload: ["id": id, "type": type.rawValue], wrapsData: true))
    }

    /// Anime only, 100 per page.
    func episodes(animeId: String, page: Int = 1) async throws -> TenraiListResponse<TenraiEpisode> {
        try await get("/anime/\(animeId)/episodes", query: [.init(name: "page", value: String(page))],
                      proxy: ProxyCall(name: "getAnimeEpisodes", payload: ["id": animeId, "page": page], wrapsData: false))
    }

    func statistics(id: String, type: TenraiMediaType) async throws -> TenraiStatisticsResponse {
        try await get("/\(type.rawValue)/\(id)/statistics",
                      proxy: ProxyCall(name: "getWorkStatistics", payload: ["id": id, "type": type.rawValue], wrapsData: true))
    }

    func reviews(id: String, type: TenraiMediaType) async throws -> TenraiListResponse<TenraiReview> {
        try await get("/\(type.rawValue)/\(id)/reviews", query: [.init(name: "spoilers", value: "false"), .init(name: "preliminary", value: "false")],
                      proxy: ProxyCall(name: "getWorkReviews", payload: ["id": id, "type": type.rawValue], wrapsData: true))
    }

    func news(id: String, type: TenraiMediaType) async throws -> TenraiListResponse<TenraiNews> {
        try await get("/\(type.rawValue)/\(id)/news",
                      proxy: ProxyCall(name: "getWorkNews", payload: ["id": id, "type": type.rawValue], wrapsData: true))
    }

    func pictures(id: String, type: TenraiMediaType) async throws -> TenraiListResponse<TenraiPicture> {
        try await get("/\(type.rawValue)/\(id)/pictures",
                      proxy: ProxyCall(name: "getWorkPictures", payload: ["id": id, "type": type.rawValue], wrapsData: true))
    }

    /// Anime only.
    func staff(animeId: String) async throws -> TenraiListResponse<TenraiStaff> {
        try await get("/anime/\(animeId)/staff",
                      proxy: ProxyCall(name: "getAnimeStaff", payload: ["id": animeId], wrapsData: true))
    }

    func recommendations(id: String, type: TenraiMediaType) async throws -> TenraiListResponse<TenraiRecommendationWrapper> {
        try await get("/\(type.rawValue)/\(id)/recommendations",
                      proxy: ProxyCall(name: "getWorkRecommendations", payload: ["id": id, "type": type.rawValue], wrapsData: true))
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

#if DEBUG
private final class AirplaneModeProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)) }
    override func stopLoading() {}
}
#endif
