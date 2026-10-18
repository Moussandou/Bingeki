import Foundation
import SwiftData
import Testing
@testable import Bingeki

/// Offline catalogue: a payload seen once online is served again when the
/// network is gone.
struct ResponseCacheTests {
    @Test func statisticsCountExactPayloadBytesIncludingEmptyAndUTF8() async throws {
        let cache = try ResponseCache.inMemory()
        #expect(try await cache.statistics() == .init(payloadCount: 0, payloadBytes: 0))

        await cache.store(Data(), for: "empty")
        await cache.store(Data([0, 1, 255]), for: "binary")
        let text = Data("été".utf8)
        await cache.store(text, for: "text")
        #expect(try await cache.statistics() == .init(payloadCount: 3, payloadBytes: 3 + text.count))

        await cache.store(Data([42]), for: "binary")
        #expect(try await cache.statistics() == .init(payloadCount: 3, payloadBytes: 1 + text.count))
    }

    @Test @MainActor func purgeIsIdempotentAndOnlyDeletesCataloguePayloads() async throws {
        let container = try ModelContainer(
            for: CachedResponse.self, CacheIsolationRecord.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)
        let privateData = Data("library/profile/tombstones/pending changes".utf8)
        context.insert(CacheIsolationRecord(data: privateData))
        try context.save()
        let cache = ResponseCache(modelContainer: container)
        await cache.store(Data([1, 2, 3]), for: "catalogue")

        try await cache.purge()
        try await cache.purge()
        #expect(try await cache.statistics() == .init(payloadCount: 0, payloadBytes: 0))
        #expect(await cache.data(for: "catalogue") == nil)
        let preserved = try ModelContext(container).fetch(FetchDescriptor<CacheIsolationRecord>())
        #expect(preserved.count == 1)
        #expect(preserved.first?.data == privateData)
    }

    @Test func purgeRemovesOfflineFallbackAndOnlineRequestsRefillIt() async throws {
        let cache = try ResponseCache.inMemory()
        let base = URL(string: "https://api.tenrai.test/v1")!
        let online = TenraiClient(baseURL: base, session: Self.session(OnlineStub.self), cache: cache)
        let offline = TenraiClient(baseURL: base, session: Self.session(OfflineStub.self), cache: cache)
        _ = try await online.topSeasonalAnime(page: 2)
        #expect(try await cache.statistics().payloadBytes == OnlineStub.body.count)

        try await cache.purge()
        await #expect(throws: URLError.self) { try await offline.topSeasonalAnime(page: 2) }
        #expect(try await cache.statistics().payloadCount == 0)

        _ = try await online.topSeasonalAnime(page: 2)
        let cached = try await offline.topSeasonalAnime(page: 2)
        #expect(cached.data.first?.malId == 5114)
        #expect(try await cache.statistics() == .init(payloadCount: 1, payloadBytes: OnlineStub.body.count))
    }

    @Test func cacheKeyIgnoresQueryOrder() {
        let a = TenraiClient.cacheKey("/top/anime", [.init(name: "page", value: "2"), .init(name: "limit", value: "24")])
        let b = TenraiClient.cacheKey("/top/anime", [.init(name: "limit", value: "24"), .init(name: "page", value: "2")])
        #expect(a == b)
        #expect(TenraiClient.cacheKey("/anime/1/full", []) == "/anime/1/full")
    }

    @Model
    final class CacheIsolationRecord {
        var data: Data

        init(data: Data) { self.data = data }
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
