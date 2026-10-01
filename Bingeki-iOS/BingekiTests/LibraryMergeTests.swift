import Foundation
import Testing
@testable import Bingeki

struct LibraryMergeTests {
    private func work(_ id: String, updated seconds: TimeInterval, episode: Int = 0) -> Work {
        var work = Work(id: id, title: id, type: .anime, currentEpisode: episode, status: .reading)
        work.lastUpdated = Date(timeIntervalSince1970: seconds)
        return work
    }

    @Test func newerCloudEditWinsOverOlderLocalCopy() {
        let merged = LibraryMerge.merge(
            local: [work("a", updated: 100, episode: 3)],
            cloud: [work("a", updated: 200, episode: 7)],
            tombstones: []
        )
        #expect(merged.map(\.currentEpisode) == [7])
    }

    @Test func localWinsOnTieOrWhenNewer() {
        let merged = LibraryMerge.merge(
            local: [work("a", updated: 200, episode: 9)],
            cloud: [work("a", updated: 200, episode: 7)],
            tombstones: []
        )
        #expect(merged.map(\.currentEpisode) == [9])
    }

    @Test func cloudOnlyWorksAreAppendedAfterLocalOrder() {
        let merged = LibraryMerge.merge(
            local: [work("b", updated: 100), work("a", updated: 100)],
            cloud: [work("a", updated: 100), work("c", updated: 100)],
            tombstones: []
        )
        #expect(merged.map(\.id) == ["b", "a", "c"])
    }

    @Test func tombstoneDropsCloudCopyEditedBeforeTheDeletion() {
        let merged = LibraryMerge.merge(
            local: [work("keep", updated: 100)],
            cloud: [work("keep", updated: 100), work("gone", updated: 100)],
            tombstones: [Tombstone(id: "gone", deletedAt: Date(timeIntervalSince1970: 150))]
        )
        #expect(merged.map(\.id) == ["keep"])
    }

    @Test func cloudEditAfterTheDeletionSurvivesTheTombstone() {
        let merged = LibraryMerge.merge(
            local: [work("keep", updated: 100)],
            cloud: [work("keep", updated: 100), work("back", updated: 300)],
            tombstones: [Tombstone(id: "back", deletedAt: Date(timeIntervalSince1970: 150))]
        )
        #expect(merged.map(\.id) == ["keep", "back"])
    }

    @Test func pruneDropsTombstonesOlderThanTheTTL() {
        let now = Date(timeIntervalSince1970: 100 * 24 * 60 * 60)
        let fresh = Tombstone(id: "fresh", deletedAt: now.addingTimeInterval(-60))
        let stale = Tombstone(id: "stale", deletedAt: now.addingTimeInterval(-LibraryMerge.tombstoneTTL - 1))
        #expect(LibraryMerge.prune([fresh, stale], now: now) == [fresh])
    }
}
