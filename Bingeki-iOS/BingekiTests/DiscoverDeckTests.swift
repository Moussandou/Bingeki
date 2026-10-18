import Foundation
import Testing
@testable import Bingeki

@MainActor
struct DiscoverDeckTests {
    private func deck(_ defaults: UserDefaults) -> DiscoverDeck {
        let pool = (1...20).map { Work(id: "\($0)", title: "T\($0)", type: .anime, status: .planToRead) }
        return DiscoverDeck(defaults: defaults, pool: pool)
    }

    /// Like a TikTok feed: pages scrolled past don't come back next session.
    @Test func scrollingDownMarksPagesAsSeen() throws {
        let defaults = try #require(UserDefaults(suiteName: "deck-\(UUID().uuidString)"))
        let deck = deck(defaults)

        deck.setIndex(3)
        #expect(defaults.stringArray(forKey: "bk.discover.seen") == ["1", "2", "3"])

        // Scrolling back up to re-watch doesn't unsee anything or duplicate.
        deck.setIndex(1)
        deck.setIndex(3)
        #expect(defaults.stringArray(forKey: "bk.discover.seen") == ["1", "2", "3"])
    }

    @Test func refillFailureRetriesSamePageWithoutLosingCards() async throws {
        let fixture = DeckFixture()
        fixture.set("/v1/seasons/now", statuses: [500, 200], ids: [11])
        fixture.set("/v1/top/anime", statuses: [200], ids: [22])
        fixture.set("/v1/top/manga", statuses: [200], ids: [])
        let deck = try makeDeck(fixture)
        await deck.load(library: [])
        #expect(deck.phase == .loaded && deck.hasRefillError)
        #expect(deck.pool.map(\.id) == ["22"])
        await deck.refill()
        #expect(!deck.hasRefillError)
        #expect(Set(deck.pool.map(\.id)) == ["11", "22"])
        #expect(fixture.pages("/v1/seasons/now") == ["1", "1"])
        #expect(fixture.pages("/v1/top/anime") == ["1"])
    }

    @Test func failedRecommendationSeedIsRetriedAndNotExhausted() async throws {
        let fixture = DeckFixture()
        fixture.set("/v1/anime/7/recommendations", statuses: [500, 200], ids: [8])
        let deck = try makeDeck(fixture)
        await deck.load(library: [Work(id: "7", title: "Seed", type: .anime, status: .completed)])
        #expect(deck.phase == .failed && deck.hasRefillError && deck.hasMore)
        await deck.refill()
        #expect(deck.pool.map(\.id) == ["8"])
        #expect(!deck.hasRefillError && !deck.hasMore)
        #expect(fixture.pages("/v1/anime/7/recommendations").count == 2)
    }

    @Test func enrichmentRetriesAfter429AndPreservesCardOnFailure() async throws {
        let fixture = DeckFixture()
        fixture.set("/v1/anime/1/full", statuses: [429, 200], ids: [1])
        let deck = try makeDeck(fixture, pool: [Work(id: "1", title: "Original", type: .anime, status: .planToRead)])
        await deck.enrichVisibleCards()
        #expect(deck.currentCard?.title == "Original")
        #expect(deck.enrichmentFailures == ["1"])
        await deck.enrichVisibleCards()
        #expect(deck.currentCard?.title == "Title 1")
        #expect(deck.enrichmentFailures.isEmpty)
        await deck.enrichVisibleCards()
        #expect(fixture.pages("/v1/anime/1/full").count == 2)
    }

    @Test func successfulEmptyIsExhaustedNotFailedAndConfigurationInvalidates() async throws {
        let fixture = DeckFixture()
        let deck = try makeDeck(fixture)
        await deck.loadIfNeeded(library: [])
        #expect(deck.phase == .loaded && !deck.hasMore && !deck.hasRefillError)
        let count = fixture.pages("/v1/seasons/now").count
        await deck.loadIfNeeded(library: [])
        #expect(fixture.pages("/v1/seasons/now").count == count)
        await deck.loadIfNeeded(library: [], sfw: false)
        #expect(fixture.pages("/v1/seasons/now").count == count + 1)
        await deck.loadIfNeeded(library: [Work(id: "1", title: "Owned", type: .anime, status: .reading)], sfw: false)
        #expect(fixture.pages("/v1/seasons/now").count == count + 2)
    }

    @Test func invalidationIgnoresOldRefillAndConcurrentRefillIsIgnored() async throws {
        let fixture = DeckFixture()
        fixture.set("/v1/seasons/now", statuses: [200], ids: [99])
        let oldResponse: TenraiListResponse<TenraiMedia> = try fixture.response("/v1/seasons/now")
        var continuation: CheckedContinuation<TenraiListResponse<TenraiMedia>, Never>?
        var calls = 0
        let defaults = try #require(UserDefaults(suiteName: "deck-\(UUID().uuidString)"))
        let deck = DiscoverDeck(defaults: defaults, requests: .init(
            season: { _, _ in
                calls += 1
                if calls == 1 { return await withCheckedContinuation { continuation = $0 } }
                return TenraiListResponse(data: [], pagination: nil)
            },
            top: { _, _, _ in TenraiListResponse(data: [], pagination: nil) },
            recommendations: { _ in TenraiListResponse(data: [], pagination: nil) },
            details: { _ in throw TenraiClient.ClientError.badStatus(500) }
        ))
        let pending = Task { await deck.load(library: [], sfw: false) }
        while continuation == nil { await Task.yield() }
        await deck.refill()
        #expect(calls == 1)
        await deck.load(library: [], sfw: true)
        #expect(deck.pool.isEmpty && deck.phase == .loaded && !deck.isRefilling)
        continuation?.resume(returning: oldResponse)
        await pending.value
        #expect(deck.pool.isEmpty && !deck.hasMore && !deck.hasRefillError)
        #expect(calls == 2)
    }

    @Test func invalidationIgnoresOldEnrichment() async throws {
        let fixture = DeckFixture()
        fixture.set("/v1/anime/1/full", statuses: [200], ids: [1])
        let full: TenraiDetailResponse = try fixture.response("/v1/anime/1/full")
        var continuation: CheckedContinuation<TenraiDetailResponse, Never>?
        let defaults = try #require(UserDefaults(suiteName: "deck-\(UUID().uuidString)"))
        let deck = DiscoverDeck(
            defaults: defaults,
            pool: [Work(id: "1", title: "Original", type: .anime, status: .planToRead)],
            requests: .init(
                season: { _, _ in TenraiListResponse(data: [], pagination: nil) },
                top: { _, _, _ in TenraiListResponse(data: [], pagination: nil) },
                recommendations: { _ in TenraiListResponse(data: [], pagination: nil) },
                details: { _ in await withCheckedContinuation { continuation = $0 } }
            )
        )
        let pending = Task { await deck.enrichVisibleCards() }
        while continuation == nil { await Task.yield() }
        await deck.load(library: [])
        continuation?.resume(returning: full)
        await pending.value
        #expect(deck.pool.isEmpty && deck.enrichmentFailures.isEmpty)
    }

    @Test func swipingToPreloadedCardJoinsRequestDespiteCancelledWaiter() async throws {
        let fixture = DeckFixture()
        for id in 1...3 { fixture.set("/v1/anime/\(id)/full", statuses: [200], ids: [id]) }
        var continuation: CheckedContinuation<Void, Never>?
        let defaults = try #require(UserDefaults(suiteName: "deck-\(UUID().uuidString)"))
        let pool = (1...20).map { Work(id: "\($0)", title: "Original \($0)", type: .anime, status: .planToRead) }
        let deck = DiscoverDeck(defaults: defaults, pool: pool, requests: .init(
            season: { _, _ in TenraiListResponse(data: [], pagination: nil) },
            top: { _, _, _ in TenraiListResponse(data: [], pagination: nil) },
            recommendations: { _ in TenraiListResponse(data: [], pagination: nil) },
            details: { card in
                if card.id == "2" { await withCheckedContinuation { continuation = $0 } }
                return try fixture.response("/v1/anime/\(card.id)/full")
            }
        ))
        let originalWaiter = Task { await deck.enrichVisibleCards() }
        while continuation == nil { await Task.yield() }
        originalWaiter.cancel()
        deck.setIndex(1)
        var joined = false
        let visibleWaiter = Task {
            joined = true
            await deck.enrichVisibleCards()
        }
        while !joined { await Task.yield() }
        continuation?.resume()
        await originalWaiter.value
        await visibleWaiter.value
        #expect(deck.currentCard?.title == "Title 2")
        #expect(deck.nextCard?.title == "Title 3")
        #expect(deck.enrichmentFailures.isEmpty)
        #expect(fixture.pages("/v1/anime/2/full").count == 1)
    }

    private func makeDeck(_ fixture: DeckFixture, pool: [Work] = []) throws -> DiscoverDeck {
        let defaults = try #require(UserDefaults(suiteName: "deck-\(UUID().uuidString)"))
        return DiscoverDeck(defaults: defaults, pool: pool, requests: .init(
            season: { page, _ in try fixture.response("/v1/seasons/now", page: page) },
            top: { type, page, _ in try fixture.response("/v1/top/\(type.rawValue)", page: page) },
            recommendations: { try fixture.response("/v1/\($0.type.rawValue)/\($0.id)/recommendations") },
            details: { try fixture.response("/v1/\($0.type.rawValue)/\($0.id)/full") }
        ))
    }
}

@MainActor
private final class DeckFixture {
    private var statuses: [String: [Int]] = [:]
    private var ids: [String: [Int]] = [:]
    private var requests: [String: [String]] = [:]

    func set(_ path: String, statuses: [Int], ids: [Int]) {
        self.statuses[path] = statuses
        self.ids[path] = ids
    }
    func pages(_ path: String) -> [String] { requests[path] ?? [] }
    func response<T: Decodable>(_ path: String, page: Int? = nil) throws -> T {
        requests[path, default: []].append(page.map(String.init) ?? "-")
        let status = statuses[path]?.isEmpty == false ? statuses[path]!.removeFirst() : 200
        if status != 200 { throw TenraiClient.ClientError.badStatus(status) }
        let entries = (ids[path] ?? []).map { id in
            let media = "{\"mal_id\":\(id),\"title\":\"Title \(id)\",\"images\":{\"jpg\":{}}}"
            return path.hasSuffix("recommendations") ? "{\"entry\":\(media)}" : media
        }
        let payload = path.hasSuffix("/full")
            ? "{\"data\":\(entries.first ?? "{}")}"
            : "{\"data\":[\(entries.joined(separator: ","))],\"pagination\":{\"has_next_page\":false}}"
        return try JSONDecoder().decode(T.self, from: Data(payload.utf8))
    }
}
