import Foundation
import Observation

/// "Pour toi" feed — endless, like TikTok. Titles come round-robin from
/// several sources (recommendations from each library title, the season,
/// the all-time anime and manga tops). Only successful responses commit
/// cursors; a fully consumed catalogue can be explicitly restarted.
@MainActor
@Observable
final class DiscoverDeck {
    enum Phase: Equatable { case idle, loading, loaded, failed }

    private(set) var phase: Phase = .idle
    private(set) var pool: [Work] = []
    private(set) var index = 0
    /// Card id → "why this card" line.
    private(set) var reasons: [String: String] = [:]

    struct Requests {
        var season: @MainActor (Int, Bool) async throws -> TenraiListResponse<TenraiMedia>
        var top: @MainActor (TenraiMediaType, Int, Bool) async throws -> TenraiListResponse<TenraiMedia>
        var recommendations: @MainActor (Work) async throws -> TenraiListResponse<TenraiRecommendationWrapper>
        var details: @MainActor (Work) async throws -> TenraiDetailResponse

        static func live(_ client: TenraiClient) -> Self {
            Self(
                season: { try await client.topSeasonalAnime(limit: 24, page: $0, sfw: $1) },
                top: { try await client.top(type: $0, limit: 24, page: $1, sfw: $2) },
                recommendations: { try await client.recommendations(id: $0.id, type: $0.type.tenrai) },
                details: { try await client.details(id: $0.id, type: $0.type.tenrai) }
            )
        }
    }

    private let requests: Requests
    private let defaults: UserDefaults
    private var enriched: Set<String> = []
    /// Titles scrolled past, oldest first. Only the most recent
    /// `seenCooldown` are held back, so older ones come round again.
    private static let seenKey = "bk.discover.seen"
    private static let seenCap = 600
    private static let seenCooldown = 120
    /// A title isn't repeated within this many pages of itself.
    private static let repeatGap = 60
    private static let seasonTag = "LA SAISON EN COURS"
    private static let animeTag = "ANIME POPULAIRE"
    private static let mangaTag = "MANGA POPULAIRE"
    /// Refill when this many pages are left, so the end is never reached.
    private static let refillThreshold = 8

    private enum Source: CaseIterable { case recs, season, topAnime, topManga }
    /// Half the slots go to anime-only sources so trailers stay frequent.
    private static let rotation: [Source] = [.season, .recs, .topAnime, .recs, .topManga, .topAnime]
    private var rotationIndex = 0
    private var seeds: [Work] = []
    private var seedIndex = 0
    private var pages: [Source: Int] = [:]
    private var exhausted: Set<Source> = []
    private(set) var isRefilling = false
    var hasRefillError: Bool { !failedSources.isEmpty }
    private(set) var enrichmentFailures: Set<String> = []
    private var enriching: [String: Task<Void, Never>] = [:]
    private var generation = UUID()
    private var configuration: String?
    private var failedSources: Set<Source> = []
    var hasMore: Bool { exhausted.count < Source.allCases.count }
    private var owned: Set<String> = []
    private var sfw = true

    init(client: TenraiClient = .shared, defaults: UserDefaults = .standard, pool: [Work] = [], requests: Requests? = nil) {
        self.requests = requests ?? .live(client)
        self.defaults = defaults
        self.pool = pool
        if !pool.isEmpty { phase = .loaded }
    }

    var currentCard: Work? { pool.indices.contains(index) ? pool[index] : nil }
    var nextCard: Work? { pool.indices.contains(index + 1) ? pool[index + 1] : nil }

    func advance() { setIndex(index + 1) }

    /// The feed's current page; pulls more titles when nearing the end.
    /// Moving down marks the pages left behind as seen.
    func setIndex(_ newIndex: Int) {
        let target = max(0, newIndex)
        if target > index, index < pool.count {
            markSeen(pool[index..<min(target, pool.count)].map(\.identity.key))
        }
        index = target
        if pool.count - index <= Self.refillThreshold {
            Task { await refill() }
        }
    }

    /// Appends fresh titles until there's a comfortable buffer ahead.
    func refill() async {
        guard !isRefilling else { return }
        let token = generation
        isRefilling = true
        defer {
            if generation == token {
                isRefilling = false
                phase = pool.isEmpty && hasRefillError ? .failed : .loaded
            }
        }

        var attempts = 0
        var attemptedFailures: Set<Source> = []
        while pool.count - index < Self.refillThreshold * 2 || hasRefillError, attempts < 10 {
            attempts += 1
            if !hasMore { break }
            let source = Self.rotation[rotationIndex % Self.rotation.count]
            rotationIndex += 1
            guard !exhausted.contains(source), !attemptedFailures.contains(source) else { continue }
            if pool.count - index >= Self.refillThreshold * 2 && !failedSources.contains(source) { continue }
            let fetched: ([Work], String?)?
            do {
                fetched = try await fetch(source, token: token)
            } catch {
                guard generation == token, !Task.isCancelled else { return }
                failedSources.insert(source)
                attemptedFailures.insert(source)
                continue
            }
            guard generation == token, !Task.isCancelled else { return }
            failedSources.remove(source)
            guard let (works, tag) = fetched else { continue }

            let recent = Set(pool.suffix(Self.repeatGap).map(\.identity.key))
            let cooldown = Set(seen.suffix(Self.seenCooldown))
            let fresh = works.filter { !owned.contains($0.identity.key) && !recent.contains($0.identity.key) && !cooldown.contains($0.identity.key) }
            // Mostly-seen catalogue: let cooled-down titles back in rather than stall.
            let batch = (fresh.isEmpty
                ? works.filter { !owned.contains($0.identity.key) && !recent.contains($0.identity.key) }
                : fresh).uniqued()
            if let tag { for work in batch { reasons[work.identity.key] = tag } }
            pool.append(contentsOf: batch.shuffled().prefix(4))
        }
    }

    private func fetch(_ source: Source, token: UUID) async throws -> ([Work], String?)? {
        switch source {
        case .recs:
            guard seedIndex < seeds.count else {
                exhausted.insert(.recs)
                return nil
            }
            let seed = seeds[seedIndex]
            let recs = try await requests.recommendations(seed)
            guard generation == token, !Task.isCancelled else { return nil }
            seedIndex += 1
            if seedIndex == seeds.count { exhausted.insert(.recs) }
            let because = seed.status == .planToRead ? "PROCHE DE" : "PARCE QUE TU AS AIMÉ"
            let works = recs.data.prefix(16).map { $0.entry.asWork(mediaType: seed.type.tenrai) }
            for work in works { reasons[work.identity.key] = "\(because) \(seed.title.uppercased())" }
            return (works, nil)
        case .season, .topAnime, .topManga:
            let page = (pages[source] ?? 0) + 1
            let response: TenraiListResponse<TenraiMedia>
            let type: TenraiMediaType
            let tag: String
            switch source {
            case .season:
                response = try await requests.season(page, sfw)
                type = .anime; tag = Self.seasonTag
            case .topAnime:
                response = try await requests.top(.anime, page, sfw)
                type = .anime; tag = Self.animeTag
            default:
                response = try await requests.top(.manga, page, sfw)
                type = .manga; tag = Self.mangaTag
            }
            guard generation == token, !Task.isCancelled else { return nil }
            pages[source] = page
            if response.pagination?.hasNextPage != true { exhausted.insert(source) }
            return (response.data.map { $0.asWork(mediaType: type) }, tag)
        }
    }

    private var seen: [String] {
        get { defaults.stringArray(forKey: Self.seenKey) ?? [] }
        set { defaults.set(Array(newValue.suffix(Self.seenCap)), forKey: Self.seenKey) }
    }

    /// Moves ids to the end of the history (most recent last).
    private func markSeen(_ ids: [String]) {
        guard !ids.isEmpty else { return }
        let moved = Set(ids)
        seen = seen.filter { !moved.contains($0) } + ids
    }

    func loadIfNeeded(library: [Work], sfw: Bool = true) async {
        guard phase == .idle || configuration != Self.configurationKey(library: library, sfw: sfw) else { return }
        await load(library: library, sfw: sfw)
    }

    static func configurationKey(library: [Work], sfw: Bool) -> String {
        "\(sfw)|" + library.map { "\($0.identity.key):\($0.status.rawValue)" }.sorted().joined(separator: "|")
    }

    func load(library: [Work], sfw: Bool = true) async {
        generation = UUID()
        configuration = Self.configurationKey(library: library, sfw: sfw)
        isRefilling = false
        enriched = []
        for request in enriching.values { request.cancel() }
        enriching = [:]
        enrichmentFailures = []
        failedSources = []
        phase = .loading
        index = 0
        pool = []
        reasons = [:]
        rotationIndex = 0
        pages = [:]
        exhausted = []
        self.sfw = sfw
        owned = Set(library.map(\.identity.key))
        // Every watched title seeds recommendations (else the "À voir" list),
        // in random order so each session starts from a different angle.
        let engaged = library.filter { $0.status == .completed || $0.status == .reading }
        seeds = (engaged.isEmpty ? library.filter { $0.status == .planToRead } : engaged).shuffled()
        seedIndex = 0

        await refill()
    }

    /// Recommendation payloads lack genres/synopsis/trailer — fetch them for visible cards.
    func enrichVisibleCards() async {
        let token = generation
        for offset in 0...1 {
            let i = index + offset
            guard generation == token, !Task.isCancelled else { return }
            guard pool.indices.contains(i), !enriched.contains(pool[i].identity.key) else { continue }
            let card = pool[i]
            let key = card.identity.key
            let needsTrailer = card.type == .anime && card.trailerYouTubeId == nil
            guard card.genres.isEmpty || card.synopsis == nil || needsTrailer else {
                enriched.insert(key)
                continue
            }
            if let pending = enriching[key] {
                await pending.value
                continue
            }
            // A swipe cancels the view's waiter, not the shared card request.
            let pending = Task {
                defer { if generation == token { enriching.removeValue(forKey: key) } }
                do {
                    let full = try await requests.details(card)
                    guard generation == token else { return }
                    let detailed = full.data.asWork(mediaType: card.type.tenrai)
                    guard let j = pool.firstIndex(where: { $0.identity == card.identity }) else { return }
                    pool[j] = detailed
                    enriched.insert(key)
                    enrichmentFailures.remove(key)
                } catch {
                    guard generation == token else { return }
                    enrichmentFailures.insert(key)
                }
            }
            enriching[key] = pending
            await pending.value
        }
    }
}
