import Foundation
import Observation

/// "Pour toi" deck: recommendations seeded by the library, padded with the season.
@MainActor
@Observable
final class DiscoverDeck {
    enum Phase: Equatable { case idle, loading, loaded, failed }

    private(set) var phase: Phase = .idle
    private(set) var pool: [Work] = []
    private(set) var index = 0
    /// Card id → "why this card" line.
    private(set) var reasons: [String: String] = [:]

    private let client: TenraiClient
    private let defaults: UserDefaults
    private var enriched: Set<String> = []
    private static let passedKey = "bk.discover.passed"
    private static let seasonTag = "LA SAISON EN COURS"
    private static let popularTag = "POPULAIRE EN CE MOMENT"
    /// Refill the deck when this many cards are left, so the user never
    /// reaches the "Recommencer" end screen while more titles exist.
    private static let refillThreshold = 5

    // Infinite feed: the season's later pages, then the all-time top.
    private var seasonPage = 1
    private var seasonHasMore = true
    private var topPage = 0
    private var topHasMore = true
    private var isRefilling = false
    private var excludedIds: Set<String> = []
    private var sfw = true

    init(client: TenraiClient = .shared, defaults: UserDefaults = .standard, pool: [Work] = []) {
        self.client = client
        self.defaults = defaults
        self.pool = pool
        if !pool.isEmpty { phase = .loaded }
    }

    var currentCard: Work? { pool.indices.contains(index) ? pool[index] : nil }
    var nextCard: Work? { pool.indices.contains(index + 1) ? pool[index + 1] : nil }

    func advance() { setIndex(index + 1) }

    /// The feed's current page; pulls more titles when nearing the end.
    func setIndex(_ newIndex: Int) {
        index = max(0, newIndex)
        if pool.count - index <= Self.refillThreshold {
            Task { await refill() }
        }
    }

    /// Appends the next page of titles not already owned, passed or in the deck.
    func refill() async {
        guard phase == .loaded, !isRefilling, seasonHasMore || topHasMore else { return }
        isRefilling = true
        defer { isRefilling = false }

        let response: TenraiListResponse<TenraiMedia>?
        let tag: String
        if seasonHasMore {
            seasonPage += 1
            response = try? await client.topSeasonalAnime(limit: 24, page: seasonPage, sfw: sfw)
            seasonHasMore = response?.pagination?.hasNextPage ?? false
            tag = Self.seasonTag
        } else {
            topPage += 1
            response = try? await client.top(type: .anime, limit: 24, page: topPage, sfw: sfw)
            topHasMore = response?.pagination?.hasNextPage ?? false
            tag = Self.popularTag
        }
        guard let response else { return }

        let inDeck = Set(pool.map(\.id))
        let fresh = response.data
            .map { $0.asWork(mediaType: .anime) }
            .filter { !inDeck.contains($0.id) && !excludedIds.contains($0.id) && !passed.contains($0.id) }
        for work in fresh { reasons[work.id] = tag }
        pool.append(contentsOf: fresh)
        // A page made only of known titles: keep going.
        if fresh.isEmpty, pool.count - index <= Self.refillThreshold {
            isRefilling = false
            await refill()
        }
    }

    /// Titles swiped left — never shown again.
    private var passed: Set<String> {
        get { Set(defaults.stringArray(forKey: Self.passedKey) ?? []) }
        set { defaults.set(Array(newValue.suffix(500)), forKey: Self.passedKey) }
    }

    func markPassed(_ work: Work) { passed.insert(work.id) }

    func loadIfNeeded(library: [Work], sfw: Bool = true) async {
        guard phase == .idle else { return }
        await load(library: library, sfw: sfw)
    }

    func load(library: [Work], sfw: Bool = true) async {
        phase = .loading
        index = 0
        seasonPage = 1
        seasonHasMore = true
        topPage = 0
        topHasMore = true
        self.sfw = sfw
        let owned = Set(library.map(\.id))
        let excluded = owned.union(passed)
        excludedIds = owned
        var cards: [Work] = []
        var reasons: [String: String] = [:]

        // Up to two seeds: watched titles first, else ones on the "À voir" list.
        let byRecent = library.sorted { ($0.lastUpdated ?? .distantPast) > ($1.lastUpdated ?? .distantPast) }
        let engaged = byRecent.filter { $0.status == .completed || $0.status == .reading }
        let seeds = (engaged.isEmpty ? byRecent.filter { $0.status == .planToRead } : engaged).prefix(2)
        for seed in seeds {
            guard let recs = try? await client.recommendations(id: seed.id, type: seed.type.tenrai) else { continue }
            let because = seed.status == .planToRead ? "PROCHE DE" : "PARCE QUE TU AS AIMÉ"
            for rec in recs.data.prefix(12) {
                let work = rec.entry.asWork(mediaType: seed.type.tenrai)
                guard reasons[work.id] == nil else { continue }
                cards.append(work)
                reasons[work.id] = "\(because) \(seed.title.uppercased())"
            }
        }

        do {
            let seasonal = try await client.topSeasonalAnime(limit: 24, sfw: sfw)
            seasonHasMore = seasonal.pagination?.hasNextPage ?? false
            for media in seasonal.data {
                let work = media.asWork(mediaType: .anime)
                guard reasons[work.id] == nil else { continue }
                cards.append(work)
                reasons[work.id] = Self.seasonTag
            }
        } catch {
            if cards.isEmpty {
                phase = .failed
                return
            }
        }

        // Interleave so recommendations don't all come first.
        let recs = cards.filter { reasons[$0.id] != Self.seasonTag }
        let season = cards.filter { reasons[$0.id] == Self.seasonTag }
        var mixed: [Work] = []
        for i in 0..<max(recs.count, season.count) {
            if i < recs.count { mixed.append(recs[i]) }
            if i < season.count { mixed.append(season[i]) }
        }

        pool = mixed.filter { !excluded.contains($0.id) }
        self.reasons = reasons
        phase = .loaded
        // Everything was already seen or owned: pull more right away.
        if pool.count <= Self.refillThreshold { await refill() }
    }

    /// Recommendation payloads lack genres/synopsis/trailer — fetch them for visible cards.
    func enrichVisibleCards() async {
        for offset in 0...1 {
            let i = index + offset
            guard pool.indices.contains(i), !enriched.contains(pool[i].id) else { continue }
            let card = pool[i]
            enriched.insert(card.id)
            let needsTrailer = card.type == .anime && card.trailerYouTubeId == nil
            guard card.genres.isEmpty || card.synopsis == nil || needsTrailer,
                  let full = try? await client.details(id: card.id, type: card.type.tenrai) else { continue }
            let detailed = full.data.asWork(mediaType: card.type.tenrai)
            guard let j = pool.firstIndex(where: { $0.id == card.id }) else { continue }
            pool[j] = detailed
        }
    }
}
