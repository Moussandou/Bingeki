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

    /// The Cloud Function equivalent of a direct path. `wrapsData` is true
    /// for callables that return Jikan's `data` payload unwrapped (the
    /// response types here expect the `{ "data": … }` envelope).
    struct ProxyCall: Sendable {
        var name: String
        var payload: [String: any Sendable]
        var wrapsData: Bool
    }

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = [], proxy: ProxyCall? = nil) async throws -> T {
        do {
            return try await direct(path, query: query)
        } catch {
            guard let proxy, Self.shouldFallBack(on: error) else { throw error }
            let data = try await Self.callProxy(proxy)
            do {
                return try JSONDecoder.tenrai.decode(T.self, from: data)
            } catch {
                throw ClientError.decoding(error)
            }
        }
    }

    /// Network failures and server-side refusals go to the proxy; a
    /// decoding error would fail the same way through it, so it doesn't.
    private static func shouldFallBack(on error: Error) -> Bool {
        if error is URLError { return true }
        if case ClientError.badStatus(let status) = error {
            return status == -1 || status == 403 || status == 429 || status >= 500
        }
        return false
    }

    private static func callProxy(_ proxy: ProxyCall) async throws -> Data {
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

    private func direct<T: Decodable>(_ path: String, query: [URLQueryItem]) async throws -> T {
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
        do {
            return try JSONDecoder.tenrai.decode(T.self, from: data)
        } catch {
            throw ClientError.decoding(error)
        }
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
