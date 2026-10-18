import Foundation
import Observation

enum WorkDetailPhase: Equatable { case idle, loading, content, empty, error, notFound }

/// In-memory state only: the transport does not expose network-cache freshness.
@MainActor @Observable
final class WorkDetailResource<Value> {
    private(set) var value: Value?
    private(set) var phase: WorkDetailPhase = .idle
    private var key = ""
    private var request: UUID?
    private var cache: [String: (value: Value, phase: WorkDetailPhase)] = [:]

    var hasContent: Bool { cache[key]?.phase == .content }

    func activate(_ key: String) {
        guard self.key != key else { return }
        self.key = key
        request = nil
        value = cache[key]?.value
        phase = cache[key]?.phase ?? .idle
    }

    func load(force: Bool = false, isEmpty: @MainActor (Value) -> Bool = { _ in false },
              operation: @MainActor () async throws -> Value) async {
        guard !Task.isCancelled, request == nil, force || phase == .idle else { return }
        let token = UUID()
        request = token
        phase = .loading
        do {
            let result = try await operation()
            guard request == token else { return }
            try Task.checkCancellation()
            value = result
            phase = isEmpty(result) ? .empty : .content
            cache[key] = (result, phase)
        } catch {
            guard request == token else { return }
            if error is CancellationError || Task.isCancelled {
                phase = cache[key]?.phase ?? .idle
            } else if case TenraiClient.ClientError.badStatus(404) = error {
                phase = .notFound
            } else {
                phase = .error
            }
        }
        request = nil
    }
}

@MainActor @Observable
final class WorkEpisodePages {
    struct Snapshot {
        var episodes: [TenraiEpisode] = []
        var page = 0
        var hasMore = true
    }

    private(set) var snapshot = Snapshot()
    private(set) var phase: WorkDetailPhase = .idle
    private var key = ""
    private var request: UUID?
    private var cache: [String: Snapshot] = [:]

    var isLoading: Bool { phase == .loading }

    func activate(_ key: String) {
        guard self.key != key else { return }
        self.key = key
        request = nil
        snapshot = cache[key] ?? Snapshot()
        phase = snapshot.page == 0 ? .idle : (snapshot.episodes.isEmpty ? .empty : .content)
    }

    func loadNext(operation: @MainActor (Int) async throws -> TenraiListResponse<TenraiEpisode>) async {
        guard !Task.isCancelled, request == nil, snapshot.hasMore else { return }
        let token = UUID()
        let next = snapshot.page + 1
        request = token
        phase = .loading
        do {
            let response = try await operation(next)
            guard request == token else { return }
            try Task.checkCancellation()
            if let returned = response.pagination?.currentPage, returned != next {
                throw URLError(.badServerResponse)
            }
            var ids = Set(snapshot.episodes.map(\.id))
            snapshot.episodes += response.data.filter { ids.insert($0.id).inserted }
            snapshot.page = next
            snapshot.hasMore = response.pagination?.hasNextPage ?? false
            cache[key] = snapshot
            phase = snapshot.episodes.isEmpty ? .empty : .content
        } catch {
            guard request == token else { return }
            phase = error is CancellationError || Task.isCancelled
                ? (snapshot.page == 0 ? .idle : (snapshot.episodes.isEmpty ? .empty : .content)) : .error
        }
        request = nil
    }
}

@MainActor @Observable
final class WorkDetailState {
    let details = WorkDetailResource<TenraiDetailResponse>()
    let cast = WorkDetailResource<[TenraiCharacterRole]>()
    let recommendations = WorkDetailResource<[TenraiRecommendationWrapper]>()
    let reviews = WorkDetailResource<[TenraiReview]>()
    let news = WorkDetailResource<[TenraiNews]>()
    let pictures = WorkDetailResource<[TenraiPicture]>()
    let stats = WorkDetailResource<TenraiStatistics>()
    let staff = WorkDetailResource<[TenraiStaff]>()
    let episodes = WorkEpisodePages()
    private(set) var identity = ""

    static func key(_ work: Work) -> String { "\(work.type.rawValue)/\(work.id)" }

    var hasMusic: Bool {
        let theme = details.value?.extras?.theme
        return !(theme?.openings ?? []).isEmpty || !(theme?.endings ?? []).isEmpty
    }

    var musicPhase: WorkDetailPhase {
        details.phase == .content ? (hasMusic ? .content : .empty) : details.phase
    }

    static func statisticsAreEmpty(_ stats: TenraiStatistics) -> Bool {
        [stats.current, stats.completed, stats.onHold, stats.dropped, stats.planned, stats.total]
            .allSatisfy { ($0 ?? 0) == 0 }
            && (stats.scores ?? []).allSatisfy { $0.votes == 0 && $0.percentage == 0 }
    }

    func activate(_ work: Work) {
        let key = Self.key(work)
        identity = key
        details.activate(key)
        cast.activate(key)
        recommendations.activate(key)
        reviews.activate(key)
        news.activate(key)
        pictures.activate(key)
        stats.activate(key)
        staff.activate(key)
        episodes.activate(key)
    }
}
