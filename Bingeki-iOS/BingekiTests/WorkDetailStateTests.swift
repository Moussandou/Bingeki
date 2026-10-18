import Foundation
import Testing
@testable import Bingeki

@MainActor
struct WorkDetailStateTests {
    private func decode<T: Decodable>(_ json: String, as: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    private func page(_ ids: [Int], number: Int, more: Bool) -> TenraiListResponse<TenraiEpisode> {
        TenraiListResponse(
            data: ids.map { TenraiEpisode(malId: $0, title: "Episode \($0)", aired: nil, filler: nil, recap: nil) },
            pagination: TenraiPagination(hasNextPage: more, currentPage: number)
        )
    }

    @Test func initialSkeletonThenContentAndTerminalEmpty() async {
        let resource = WorkDetailResource<[Int]>()
        resource.activate("anime/1")
        #expect(resource.phase == .idle)
        let gate = DetailGate<[Int]>()
        let task = Task { await resource.load(isEmpty: \.isEmpty) { try await gate.wait() } }
        await gate.started()
        #expect(resource.phase == .loading)
        #expect(resource.value == nil)
        var duplicateStarted = false
        await resource.load(force: true) { duplicateStarted = true; return [99] }
        #expect(!duplicateStarted)
        gate.succeed([1])
        await task.value
        #expect(resource.phase == .content)
        #expect(resource.value == [1])
        #expect(resource.hasContent)
        await resource.load(force: true, isEmpty: \.isEmpty) { [] }
        #expect(resource.phase == .empty)
        #expect(resource.value == [])
        #expect(!resource.hasContent)
    }

    @Test func errorsAreNotEmptyAndRetryRetainsSuccessfulContent() async {
        let resource = WorkDetailResource<[Int]>()
        await resource.load(isEmpty: \.isEmpty) { throw URLError(.notConnectedToInternet) }
        #expect(resource.phase == .error)
        #expect(resource.value == nil)
        await resource.load(force: true, isEmpty: \.isEmpty) { [7] }
        await resource.load(force: true) { throw TenraiClient.ClientError.badStatus(500) }
        #expect(resource.phase == .error)
        #expect(resource.value == [7])
        #expect(resource.hasContent)
        let gate = DetailGate<[Int]>()
        let task = Task { await resource.load(force: true) { try await gate.wait() } }
        await gate.started()
        #expect(resource.phase == .loading)
        #expect(resource.value == [7])
        gate.succeed([8])
        await task.value
        #expect(resource.phase == .content)
        #expect(resource.value == [8])
    }

    @Test(arguments: [false, true])
    func notFoundDoesNotDependOnOwnershipOrChangeLocalWork(owned: Bool) async throws {
        var work = Work(id: "1", title: "Local title", type: .anime, currentEpisode: 12, status: .reading)
        work.synopsis = "Local synopsis"
        work.rating = 8
        let localLibrary = owned ? [work] : []
        let state = WorkDetailState()
        state.activate(work)
        await state.details.load { throw TenraiClient.ClientError.badStatus(404) }
        #expect(state.details.phase == .notFound)
        #expect(work.currentEpisode == 12)
        #expect(work.rating == 8)
        #expect(work.synopsis == "Local synopsis")
        #expect(localLibrary.count == (owned ? 1 : 0))
        let recovered: TenraiDetailResponse = try decode(#"{"data":{"mal_id":1,"title":"Recovered","images":{}}}"#)
        await state.details.load(force: true) { recovered }
        #expect(state.details.phase == .content)
    }

    @Test func independentSectionsCompleteWhileAnotherIsSuspendedOrFails() async throws {
        let state = WorkDetailState()
        state.activate(.sampleFrieren)
        let gate = DetailGate<[TenraiCharacterRole]>()
        let task = Task { await state.cast.load(isEmpty: \.isEmpty) { try await gate.wait() } }
        await gate.started()
        await state.reviews.load { throw URLError(.timedOut) }
        await state.news.load(isEmpty: \.isEmpty) { [] }
        let pictures: [TenraiPicture] = try decode(#"[{"jpg":{"image_url":"https://example.com/image.jpg"}}]"#)
        await state.pictures.load(isEmpty: \.isEmpty) { pictures }
        await state.recommendations.load { throw TenraiClient.ClientError.badStatus(500) }
        await state.staff.load(isEmpty: \.isEmpty) { [] }
        #expect(state.cast.phase == .loading)
        #expect(state.reviews.phase == .error)
        #expect(state.news.phase == .empty)
        #expect(state.pictures.phase == .content)
        #expect(state.recommendations.phase == .error)
        #expect(state.staff.phase == .empty)
        gate.succeed([])
        await task.value
        #expect(state.cast.phase == .empty)
    }

    @Test func musicAndStatisticsWithoutDataAreTerminal() async throws {
        let state = WorkDetailState()
        let noTheme: TenraiDetailResponse = try decode(#"{"data":{"mal_id":1,"title":"Title","images":{}}}"#)
        await state.details.load { noTheme }
        #expect(!state.hasMusic)
        #expect(state.musicPhase == .empty)
        let emptyThemes: TenraiDetailResponse = try decode(#"{"data":{"mal_id":1,"title":"Title","images":{},"theme":{"openings":[],"endings":[]}}}"#)
        await state.details.load(force: true) { emptyThemes }
        #expect(state.musicPhase == .empty)
        let emptyStats: TenraiStatistics = try decode("{}")
        await state.stats.load(isEmpty: WorkDetailState.statisticsAreEmpty) { emptyStats }
        #expect(state.stats.phase == .empty)
        let zeroStats: TenraiStatistics = try decode(#"{"total":0,"watching":0,"scores":[{"score":1,"votes":0,"percentage":0}]}"#)
        #expect(WorkDetailState.statisticsAreEmpty(zeroStats))
        let populatedStats: TenraiStatistics = try decode(#"{"total":12,"watching":8}"#)
        #expect(!WorkDetailState.statisticsAreEmpty(populatedStats))
        await state.details.load(force: true) { throw URLError(.notConnectedToInternet) }
        #expect(state.musicPhase == .error)
        await state.stats.load(force: true) { throw URLError(.timedOut) }
        #expect(state.stats.phase == .error)
        #expect(!state.stats.hasContent)
        let music: TenraiDetailResponse = try decode(#"{"data":{"mal_id":1,"title":"Title","images":{},"theme":{"openings":["Song"],"endings":[]}}}"#)
        await state.details.load(force: true) { music }
        #expect(state.musicPhase == .content)
        #expect(state.hasMusic)
    }

    @Test func oldWorkResponsesAndFailuresCannotOverwriteNewIdentity() async {
        for failure in [false, true] {
            let resource = WorkDetailResource<[Int]>()
            resource.activate("anime/1")
            let gate = DetailGate<[Int]>()
            let task = Task { await resource.load { try await gate.wait() } }
            await gate.started()
            resource.activate("manga/1")
            await resource.load { [2] }
            if failure { gate.fail(TenraiClient.ClientError.badStatus(404)) } else { gate.succeed([1]) }
            await task.value
            #expect(resource.value == [2])
            #expect(resource.phase == .content)
        }
    }

    @Test func changingWorkResetsEverySectionIncludingSameNumericID() async {
        let state = WorkDetailState()
        state.activate(Work(id: "1", title: "Anime", type: .anime, status: .planToRead))
        await state.cast.load(isEmpty: \.isEmpty) { [] }
        await state.reviews.load { throw URLError(.timedOut) }
        await state.news.load(isEmpty: \.isEmpty) { [] }
        await state.pictures.load(isEmpty: \.isEmpty) { [] }
        await state.recommendations.load(isEmpty: \.isEmpty) { [] }
        await state.staff.load(isEmpty: \.isEmpty) { [] }
        await state.episodes.loadNext { number in page([1], number: number, more: false) }
        state.activate(Work(id: "1", title: "Manga", type: .manga, status: .planToRead))
        #expect(state.identity == "manga/1")
        #expect(state.cast.phase == .idle)
        #expect(state.reviews.phase == .idle)
        #expect(state.news.phase == .idle)
        #expect(state.pictures.phase == .idle)
        #expect(state.recommendations.phase == .idle)
        #expect(state.staff.phase == .idle)
        #expect(state.episodes.snapshot.page == 0)
        #expect(state.episodes.snapshot.episodes.isEmpty)
    }

    @Test func successfulMemoryCacheIsKeyedByTypeAndPreservesEmpty() async {
        let resource = WorkDetailResource<[Int]>()
        resource.activate("anime/1")
        await resource.load(isEmpty: \.isEmpty) { [] }
        resource.activate("manga/1")
        #expect(resource.value == nil)
        await resource.load { [2] }
        resource.activate("anime/1")
        #expect(resource.phase == .empty)
        #expect(resource.value == [])
        var called = false
        await resource.load { called = true; return [3] }
        #expect(!called)
        resource.activate("manga/1")
        #expect(resource.value == [2])
    }

    @Test func cancellationReleasesSingleFlightForRetry() async {
        let resource = WorkDetailResource<[Int]>()
        let gate = DetailGate<[Int]>()
        let task = Task { await resource.load { try await gate.wait() } }
        await gate.started()
        task.cancel()
        gate.succeed([1])
        await task.value
        #expect(resource.phase == .idle)
        #expect(resource.value == nil)
        await resource.load { [2] }
        #expect(resource.value == [2])
    }

    @Test func episodesAreSingleFlightCommitAfterSuccessAndDeduplicate() async {
        let episodes = WorkEpisodePages()
        episodes.activate("anime/1")
        let gate = DetailGate<TenraiListResponse<TenraiEpisode>>()
        var requested: [Int] = []
        let task = Task {
            await episodes.loadNext { number in
                requested.append(number)
                return try await gate.wait()
            }
        }
        await gate.started()
        #expect(episodes.isLoading)
        #expect(episodes.snapshot.page == 0)
        await episodes.loadNext { number in requested.append(number); return page([], number: number, more: false) }
        #expect(requested == [1])
        gate.succeed(page([1, 1, 2], number: 1, more: true))
        await task.value
        #expect(!episodes.isLoading)
        #expect(episodes.snapshot.page == 1)
        #expect(episodes.snapshot.episodes.map(\.id) == [1, 2])
        await episodes.loadNext { number in
            requested.append(number)
            throw URLError(.timedOut)
        }
        #expect(episodes.phase == .error)
        #expect(episodes.snapshot.page == 1)
        #expect(episodes.snapshot.episodes.map(\.id) == [1, 2])
        await episodes.loadNext { number in
            requested.append(number)
            return page([2, 3], number: number, more: false)
        }
        #expect(requested == [1, 2, 2])
        #expect(episodes.snapshot.page == 2)
        #expect(episodes.snapshot.episodes.map(\.id) == [1, 2, 3])
        await episodes.loadNext { number in requested.append(number); return page([], number: number, more: false) }
        #expect(requested == [1, 2, 2])
    }

    @Test func wrongPageDoesNotAdvanceCursorAndRetriesSamePage() async {
        let episodes = WorkEpisodePages()
        await episodes.loadNext { _ in page([99], number: 2, more: true) }
        #expect(episodes.phase == .error)
        #expect(episodes.snapshot.page == 0)
        #expect(episodes.snapshot.episodes.isEmpty)
        await episodes.loadNext { number in
            #expect(number == 1)
            return page([], number: number, more: false)
        }
        #expect(episodes.phase == .empty)
        #expect(!episodes.snapshot.hasMore)
    }

    @Test func cancelledEpisodePageCanRetryAndMemoryRestoresCursor() async {
        let episodes = WorkEpisodePages()
        episodes.activate("anime/1")
        let gate = DetailGate<TenraiListResponse<TenraiEpisode>>()
        let task = Task { await episodes.loadNext { _ in try await gate.wait() } }
        await gate.started()
        task.cancel()
        gate.succeed(page([1], number: 1, more: false))
        await task.value
        #expect(episodes.phase == .idle)
        #expect(!episodes.isLoading)
        #expect(episodes.snapshot.page == 0)
        await episodes.loadNext { number in
            #expect(number == 1)
            return page([1], number: number, more: true)
        }
        episodes.activate("anime/2")
        #expect(episodes.snapshot.page == 0)
        episodes.activate("anime/1")
        #expect(episodes.snapshot.page == 1)
        #expect(episodes.snapshot.episodes.map(\.id) == [1])
        await episodes.loadNext { number in
            #expect(number == 2)
            return page([2], number: number, more: false)
        }
        #expect(episodes.snapshot.episodes.map(\.id) == [1, 2])
    }

    @Test func oldEpisodePageCannotPolluteNewWorkOrItsFlight() async {
        let episodes = WorkEpisodePages()
        episodes.activate("anime/1")
        let oldGate = DetailGate<TenraiListResponse<TenraiEpisode>>()
        let old = Task { await episodes.loadNext { _ in try await oldGate.wait() } }
        await oldGate.started()
        episodes.activate("anime/2")
        let newGate = DetailGate<TenraiListResponse<TenraiEpisode>>()
        let new = Task { await episodes.loadNext { _ in try await newGate.wait() } }
        await newGate.started()
        oldGate.succeed(page([1], number: 1, more: false))
        await old.value
        #expect(episodes.isLoading)
        #expect(episodes.snapshot.episodes.isEmpty)
        newGate.succeed(page([9], number: 1, more: false))
        await new.value
        #expect(episodes.snapshot.episodes.map(\.id) == [9])
    }
}

/// Explicit handshakes keep concurrency tests independent of timing/network.
@MainActor
private final class DetailGate<Value: Sendable> {
    private var continuation: CheckedContinuation<Value, any Error>?
    private var startContinuation: CheckedContinuation<Void, Never>?
    private var didStart = false

    func wait() async throws -> Value {
        try await withCheckedThrowingContinuation {
            continuation = $0
            didStart = true
            startContinuation?.resume()
            startContinuation = nil
        }
    }

    func started() async {
        if didStart { return }
        await withCheckedContinuation { startContinuation = $0 }
    }

    func succeed(_ value: Value) {
        continuation?.resume(returning: value)
        continuation = nil
    }

    func fail(_ error: any Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
}
