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

    init(client: TenraiClient = .shared, defaults: UserDefaults = .standard, pool: [Work] = []) {
        self.client = client
        self.defaults = defaults
        self.pool = pool
        if !pool.isEmpty { phase = .loaded }
    }

    var currentCard: Work? { pool.indices.contains(index) ? pool[index] : nil }
    var nextCard: Work? { pool.indices.contains(index + 1) ? pool[index + 1] : nil }

    func advance() { index += 1 }

    /// Titles swiped left — never shown again.
    private var passed: Set<String> {
        get { Set(defaults.stringArray(forKey: Self.passedKey) ?? []) }
        set { defaults.set(Array(newValue.suffix(500)), forKey: Self.passedKey) }
    }

    func markPassed(_ work: Work) { passed.insert(work.id) }

    func loadIfNeeded(library: [Work]) async {
        guard phase == .idle else { return }
        await load(library: library)
    }

    func load(library: [Work]) async {
        phase = .loading
        index = 0
        let owned = Set(library.map(\.id))
        let excluded = owned.union(passed)
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
            let seasonal = try await client.topSeasonalAnime(limit: 24)
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
    }

    /// Recommendation payloads lack genres/synopsis — fetch them for visible cards.
    func enrichVisibleCards() async {
        for offset in 0...1 {
            let i = index + offset
            guard pool.indices.contains(i), !enriched.contains(pool[i].id) else { continue }
            let card = pool[i]
            enriched.insert(card.id)
            guard card.genres.isEmpty || card.synopsis == nil,
                  let full = try? await client.details(id: card.id, type: card.type.tenrai) else { continue }
            let detailed = full.data.asWork(mediaType: card.type.tenrai)
            guard let j = pool.firstIndex(where: { $0.id == card.id }) else { continue }
            pool[j] = detailed
        }
    }
}
