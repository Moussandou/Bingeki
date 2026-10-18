import Foundation
import Observation
import os

enum WorkDetailPhase: Equatable { case idle, loading, content, empty, error, notFound }

/// Cancellation is signalled synchronously even while the transport is still unwinding.
@MainActor
private final class WorkDetailRequest {
    nonisolated private let cancellation = OSAllocatedUnfairLock(initialState: false)
    private var waiters: [CheckedContinuation<Void, Never>] = []
    private var completed = false

    nonisolated var isCancelled: Bool { cancellation.withLock { $0 } }
    nonisolated func cancel() { cancellation.withLock { $0 = true } }

    func wait() async {
        if completed { return }
        await withCheckedContinuation { waiters.append($0) }
    }

    func complete() {
        completed = true
        let pending = waiters
        waiters.removeAll()
        for waiter in pending { waiter.resume() }
    }
}

/// In-memory state only: the transport does not expose network-cache freshness.
@MainActor @Observable
final class WorkDetailResource<Value> {
    private(set) var value: Value?
    private(set) var phase: WorkDetailPhase = .idle
    private var key = ""
    private var request: WorkDetailRequest?
    private var cache: [String: (value: Value, phase: WorkDetailPhase)] = [:]

    var hasContent: Bool { cache[key]?.phase == .content }

    func activate(_ key: String) {
        guard self.key != key else { return }
        self.key = key
        request?.complete()
        request = nil
        value = cache[key]?.value
        phase = cache[key]?.phase ?? .idle
    }

    func load(force: Bool = false, isEmpty: @MainActor (Value) -> Bool = { _ in false },
              operation: @MainActor () async throws -> Value) async {
        let requestedKey = key
        if let active = request {
            guard active.isCancelled else { return }
            await active.wait()
        }
        guard !Task.isCancelled, key == requestedKey, request == nil, force || phase == .idle else { return }
        let token = WorkDetailRequest()
        request = token
        phase = .loading
        await withTaskCancellationHandler {
            do {
                let result = try await operation()
                guard request === token else { return }
                try Task.checkCancellation()
                value = result
                phase = isEmpty(result) ? .empty : .content
                cache[key] = (result, phase)
            } catch {
                guard request === token else { return }
                if error is CancellationError || Task.isCancelled {
                    phase = cache[key]?.phase ?? .idle
                } else if case TenraiClient.ClientError.badStatus(404) = error {
                    phase = .notFound
                } else {
                    phase = .error
                }
            }
            request = nil
            token.complete()
        } onCancel: {
            token.cancel()
        }
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
    private var request: WorkDetailRequest?
    private var cache: [String: Snapshot] = [:]

    var isLoading: Bool { phase == .loading }

    func activate(_ key: String) {
        guard self.key != key else { return }
        self.key = key
        request?.complete()
        request = nil
        snapshot = cache[key] ?? Snapshot()
        phase = snapshot.page == 0 ? .idle : (snapshot.episodes.isEmpty ? .empty : .content)
    }

    func loadNext(operation: @MainActor (Int) async throws -> TenraiListResponse<TenraiEpisode>) async {
        let requestedKey = key
        if let active = request {
            guard active.isCancelled else { return }
            await active.wait()
        }
        guard !Task.isCancelled, key == requestedKey, request == nil, snapshot.hasMore else { return }
        let token = WorkDetailRequest()
        let next = snapshot.page + 1
        request = token
        phase = .loading
        await withTaskCancellationHandler {
            do {
                let response = try await operation(next)
                guard request === token else { return }
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
                guard request === token else { return }
                phase = error is CancellationError || Task.isCancelled
                    ? (snapshot.page == 0 ? .idle : (snapshot.episodes.isEmpty ? .empty : .content)) : .error
            }
            request = nil
            token.complete()
        } onCancel: {
            token.cancel()
        }
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
