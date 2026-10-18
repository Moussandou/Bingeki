import Foundation
import Testing
@testable import Bingeki

@MainActor
struct CatalogPagerTests {
    private func work(_ id: String, type: WorkType = .anime) -> Work {
        Work(id: id, title: id, type: type, status: .planToRead)
    }

    @Test func partialFailureRetriesOnlyFailedSourceAndSamePage() async {
        var calls: [String] = []
        var fail = true
        let pager = CatalogPager(sources: ["anime", "manga"]) { source, page, _ in
            calls.append("\(source):\(page)")
            if source == "manga" && fail { throw TenraiClient.ClientError.badStatus(429) }
            return CatalogPage(works: [work("1", type: source == "anime" ? .anime : .manga)], hasMore: page < 2)
        }
        await pager.load(sfw: true)
        #expect(pager.works.count == 1)
        #expect(pager.failures == ["manga"])
        fail = false
        await pager.load(sfw: true, retry: true)
        #expect(calls == ["anime:1", "manga:1", "manga:1"])
        #expect(pager.works.count == 2)
        await pager.load(sfw: true)
        #expect(pager.works.count == 2)
        #expect(!pager.hasMore)
    }

    @Test func paginationFailureRetainsContentAndCursor() async {
        var calls: [Int] = []
        var fail = true
        let pager = CatalogPager(sources: [0]) { _, page, _ in
            calls.append(page)
            if page == 2 && fail { throw TenraiClient.ClientError.badStatus(500) }
            return CatalogPage(works: [work("1"), work("\(page)")], hasMore: page < 2)
        }
        await pager.load(sfw: true)
        await pager.load(sfw: true)
        #expect(pager.works.map(\.id) == ["1"])
        #expect(pager.failures == [0])
        fail = false
        await pager.load(sfw: true, retry: true)
        #expect(calls == [1, 2, 2])
        #expect(pager.works.map(\.id) == ["1", "2"])
    }

    @Test func filteredEmptyPagesScanIsBoundedAndCanContinue() async {
        var calls: [Int] = []
        let pager = CatalogPager(sources: [0]) { _, page, _ in
            calls.append(page)
            return CatalogPage(works: page == 4 ? [work("4")] : [], hasMore: page < 4)
        }
        await pager.load(sfw: true, emptyPageLimit: 3)
        #expect(calls == [1, 2, 3])
        #expect(pager.works.isEmpty && pager.hasMore && pager.hasLoaded)
        await pager.load(sfw: true, emptyPageLimit: 3)
        #expect(calls == [1, 2, 3, 4])
        #expect(pager.works.map(\.id) == ["4"])
        #expect(!pager.hasMore)
    }

    @Test func realEmptyIsNotFailure() async {
        let pager = CatalogPager(sources: [0]) { _, _, _ in CatalogPage(works: [], hasMore: false) }
        await pager.load(sfw: true)
        #expect(pager.hasLoaded && pager.works.isEmpty && pager.failures.isEmpty && !pager.hasMore)
    }

    @Test func resetRejectsOldResponseAndConcurrentRequestsAreIgnored() async {
        var continuation: CheckedContinuation<CatalogPage, any Error>?
        var calls = 0
        let pager = CatalogPager(sources: [0]) { _, _, _ in
            calls += 1
            return try await withCheckedThrowingContinuation { continuation = $0 }
        }
        let pending = Task { await pager.load(sfw: false) }
        while continuation == nil { await Task.yield() }
        await pager.load(sfw: false)
        #expect(calls == 1)
        pager.reset()
        continuation?.resume(returning: CatalogPage(works: [work("old")], hasMore: false))
        await pending.value
        #expect(pager.works.isEmpty && !pager.hasLoaded && !pager.isLoading)
    }
}
