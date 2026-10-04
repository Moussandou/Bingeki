import Foundation
import Observation

/// "Pour toi" feed — endless, like TikTok. Titles come round-robin from
/// several sources (recommendations from each library title, the season,
/// the all-time anime and manga tops) so anime with trailers keep showing
/// up. Scrolled-past titles only sit out a cooldown; once every source is
/// used up the cursors rewind, so the feed never ends and a skipped title
/// can come back later.
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
    private var isRefilling = false
    private var owned: Set<String> = []
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
    /// Moving down marks the pages left behind as seen.
    func setIndex(_ newIndex: Int) {
        let target = max(0, newIndex)
        if target > index, index < pool.count {
            markSeen(pool[index..<min(target, pool.count)].map(\.id))
        }
        index = target
        if pool.count - index <= Self.refillThreshold {
            Task { await refill() }
        }
    }

    /// Appends fresh titles until there's a comfortable buffer ahead.
    func refill() async {
        guard !isRefilling else { return }
        isRefilling = true
        defer { isRefilling = false }

        var attempts = 0
        while pool.count - index < Self.refillThreshold * 2, attempts < 10 {
            attempts += 1
            if exhausted.count == Source.allCases.count { rewind() }
            let source = Self.rotation[rotationIndex % Self.rotation.count]
            rotationIndex += 1
            guard !exhausted.contains(source) else { continue }
            guard let (works, tag) = await fetch(source) else { continue }

            let recent = Set(pool.suffix(Self.repeatGap).map(\.id))
            let cooldown = Set(seen.suffix(Self.seenCooldown))
            let fresh = works.filter { !owned.contains($0.id) && !recent.contains($0.id) && !cooldown.contains($0.id) }
            // Mostly-seen catalogue: let cooled-down titles back in rather than stall.
            let batch = fresh.isEmpty
                ? works.filter { !owned.contains($0.id) && !recent.contains($0.id) }
                : fresh
            if let tag { for work in batch { reasons[work.id] = tag } }
            pool.append(contentsOf: batch.shuffled().prefix(4))
        }
    }

    /// Every source used up: start them all over. The feed never ends.
    private func rewind() {
        exhausted = []
        pages = [:]
        seedIndex = 0
        seeds.shuffle()
    }

    private func fetch(_ source: Source) async -> ([Work], String?)? {
        switch source {
        case .recs:
            guard seedIndex < seeds.count else {
                exhausted.insert(.recs)
                return nil
            }
            let seed = seeds[seedIndex]
            seedIndex += 1
            guard let recs = try? await client.recommendations(id: seed.id, type: seed.type.tenrai) else { return nil }
            let because = seed.status == .planToRead ? "PROCHE DE" : "PARCE QUE TU AS AIMÉ"
            let works = recs.data.prefix(16).map { $0.entry.asWork(mediaType: seed.type.tenrai) }
            for work in works { reasons[work.id] = "\(because) \(seed.title.uppercased())" }
            return (works, nil)
        case .season, .topAnime, .topManga:
            let page = (pages[source] ?? 0) + 1
            pages[source] = page
            let response: TenraiListResponse<TenraiMedia>?
            let type: TenraiMediaType
            let tag: String
            switch source {
            case .season:
                response = try? await client.topSeasonalAnime(limit: 24, page: page, sfw: sfw)
                type = .anime; tag = Self.seasonTag
            case .topAnime:
                response = try? await client.top(type: .anime, limit: 24, page: page, sfw: sfw)
                type = .anime; tag = Self.animeTag
            default:
                response = try? await client.top(type: .manga, limit: 24, page: page, sfw: sfw)
                type = .manga; tag = Self.mangaTag
            }
            guard let response else { return nil }
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
        guard phase == .idle else { return }
        await load(library: library, sfw: sfw)
    }

    func load(library: [Work], sfw: Bool = true) async {
        phase = .loading
        index = 0
        pool = []
        reasons = [:]
        rotationIndex = 0
        pages = [:]
        exhausted = []
        self.sfw = sfw
        owned = Set(library.map(\.id))
        // Every watched title seeds recommendations (else the "À voir" list),
        // in random order so each session starts from a different angle.
        let engaged = library.filter { $0.status == .completed || $0.status == .reading }
        seeds = (engaged.isEmpty ? library.filter { $0.status == .planToRead } : engaged).shuffled()
        seedIndex = 0

        await refill()
        phase = pool.isEmpty ? .failed : .loaded
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
