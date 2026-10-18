import Foundation
import Testing
@testable import Bingeki

/// Offline catalogue: a payload seen once online is served again when the
/// network is gone.
struct ResponseCacheTests {
    @Test func cacheKeyIgnoresQueryOrder() {
        let a = TenraiClient.cacheKey("/top/anime", [.init(name: "page", value: "2"), .init(name: "limit", value: "24")])
        let b = TenraiClient.cacheKey("/top/anime", [.init(name: "limit", value: "24"), .init(name: "page", value: "2")])
        #expect(a == b)
        #expect(TenraiClient.cacheKey("/anime/1/full", []) == "/anime/1/full")
    }

    @Test func pruneDropsOnlyStaleEntries() async throws {
        let cache = try ResponseCache.inMemory()
        let now = Date.now
        await cache.store(Data("old".utf8), for: "old", at: now.addingTimeInterval(-ResponseCache.maxAge - 60))
        await cache.store(Data("fresh".utf8), for: "fresh", at: now)
        await cache.prune(now: now)
        #expect(await cache.data(for: "old") == nil)
        #expect(await cache.data(for: "fresh") == Data("fresh".utf8))
    }

    @Test func servesLastGoodPayloadWhenOffline() async throws {
        let cache = try ResponseCache.inMemory()
        let base = URL(string: "https://api.tenrai.test/v1")!

        let online = TenraiClient(baseURL: base, session: Self.session(OnlineStub.self), cache: cache)
        // Page 2 has no proxy fallback, so no Firebase in the test.
        let fresh = try await online.topSeasonalAnime(page: 2)
        #expect(fresh.data.first?.malId == 5114)

        let offline = TenraiClient(baseURL: base, session: Self.session(OfflineStub.self), cache: cache)
        let cached = try await offline.topSeasonalAnime(page: 2)
        #expect(cached.data.first?.malId == 5114)

        // Never seen online → the offline error surfaces as before.
        await #expect(throws: (any Error).self) { try await offline.topSeasonalAnime(page: 3) }
    }

    private static func session(_ stub: URLProtocol.Type) -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [stub]
        return URLSession(configuration: config)
    }
}

private final class OnlineStub: URLProtocol {
    static let body = Data("""
    {"data":[{"mal_id":5114,"title":"Fullmetal Alchemist: Brotherhood","type":"TV","images":{"jpg":{"image_url":"https://example.com/a.jpg"}}}],
     "pagination":{"last_visible_page":1,"has_next_page":false}}
    """.utf8)

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Self.body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

private final class OfflineStub: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
    }
    override func stopLoading() {}
}
