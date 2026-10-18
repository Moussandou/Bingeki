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

    @Test func deletionHistoryIsRetainedIndefinitelyAndDeduplicated() {
        let now = Date(timeIntervalSince1970: 100 * 24 * 60 * 60)
        let fresh = Tombstone(id: "fresh", deletedAt: now.addingTimeInterval(-60))
        let stale = Tombstone(id: "stale", deletedAt: now.addingTimeInterval(-95 * 24 * 60 * 60))
        let older = Tombstone(id: "fresh", deletedAt: stale.deletedAt)
        #expect(LibraryMerge.prune([older, stale, fresh], now: now) == [fresh, stale])
    }

    @Test func collidingTypesMergeAndDeleteIndependentlyOnBothSides() throws {
        let anime = work("1", updated: 100, episode: 5)
        var manga = work("1", updated: 200)
        manga.type = .manga
        manga.currentChapter = 12
        let merged = LibraryMerge.merge(local: [anime, manga], cloud: [anime, manga], tombstones: [])
        #expect(merged.map(\.identity.key) == ["anime:1", "manga:1"])

        let deletion = Tombstone(id: "1", deletedAt: Date(timeIntervalSince1970: 300), type: .anime)
        let encoded = try JSONEncoder().encode([deletion])
        let reloaded = try JSONDecoder().decode([Tombstone].self, from: encoded)
        let surviving = LibraryMerge.merge(local: merged, cloud: [anime, manga], tombstones: reloaded)
        #expect(surviving.map(\.identity.key) == ["manga:1"])
        #expect(surviving.first?.currentChapter == 12)
        #expect(LibraryMerge.merge(local: surviving, cloud: merged, tombstones: reloaded) == surviving)
        #expect(LibraryMerge.merge(local: [anime], cloud: [], tombstones: reloaded).isEmpty)
    }

    @Test func ambiguousLegacyDeletionIsRetainedWithoutDeletingEitherType() {
        let anime = work("1", updated: 100)
        var manga = anime
        manga.type = .manga
        let legacy = Tombstone(id: "1", deletedAt: Date(timeIntervalSince1970: 200))
        let migrated = LibraryMerge.migrate([legacy], works: [anime, manga])
        #expect(migrated == [legacy])
        #expect(LibraryMerge.migrate(migrated, works: [anime, manga]) == migrated)
        #expect(LibraryMerge.merge(local: [anime], cloud: [manga], tombstones: migrated).count == 2)
    }

    @Test func uniqueLegacyAndCompositeDeletionsMigrateIdempotently() {
        let anime = work("1", updated: 100)
        let legacy = Tombstone(id: "1", deletedAt: Date(timeIntervalSince1970: 200))
        let composite = Tombstone(id: "anime:1", deletedAt: Date(timeIntervalSince1970: 300))
        let migrated = LibraryMerge.migrate([legacy, composite], works: [anime])
        #expect(migrated == [Tombstone(id: "1", deletedAt: composite.deletedAt, type: .anime)])
        #expect(LibraryMerge.migrate(migrated, works: [anime]) == migrated)
        #expect(LibraryMerge.merge(local: [anime], cloud: [anime], tombstones: migrated).isEmpty)
        #expect(LibraryMerge.merge(local: [], cloud: [work("1", updated: 301)], tombstones: migrated).count == 1)
    }

    @Test func webTombstonesAcceptNumericIdsAndEpochMilliseconds() throws {
        let json = Data(#"{"id":1,"type":"manga","deletedAt":150000}"#.utf8)
        let deletion = try JSONDecoder().decode(Tombstone.self, from: json)
        #expect(deletion.identity?.key == "manga:1")
        #expect(deletion.deletedAt == Date(timeIntervalSince1970: 150))
        let roundTrip = try JSONDecoder().decode(Tombstone.self, from: JSONEncoder().encode(deletion))
        #expect(roundTrip == deletion)
    }

    @Test func nativeLegacyTombstonesSurviveRestartAndKeepAccountIsolation() throws {
        let suite = "identity-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let old = try JSONSerialization.data(withJSONObject: [
            ["id": "1", "deletedAt": now.timeIntervalSinceReferenceDate]
        ])
        defaults.set(old, forKey: "bk.tombstones.first")
        let store = TombstoneStore(uid: "first", defaults: defaults)
        let loaded = try #require(store.load().first)
        #expect(abs(loaded.deletedAt.timeIntervalSince(now)) < 0.001)
        let migrated = LibraryMerge.migrate([loaded], works: [work("1", updated: 100)])
        store.save(migrated)
        #expect(TombstoneStore(uid: "first", defaults: defaults).load() == migrated)
        #expect(TombstoneStore(uid: "second", defaults: defaults).load().isEmpty)
    }

    @MainActor @Test func typedStoreEditsRemovalAndRestartPreserveCollisions() throws {
        let anime = work("1", updated: 100)
        var manga = anime
        manga.type = .manga
        let store = InMemoryLibraryStore(seed: [anime, manga])
        var edited = anime
        edited.currentEpisode = 8
        store.upsert(edited)
        #expect(store.works.count == 2)
        #expect(store.work(identity: manga.identity)?.currentEpisode == 0)
        #expect(store.work(identity: anime.identity)?.currentEpisode == 8)
        #expect(store.work(id: "1") == nil)
        #expect(store.work(id: "manga:1")?.identity == manga.identity)
        let restarted = InMemoryLibraryStore(seed: try JSONDecoder().decode(
            [Work].self, from: JSONEncoder().encode(store.works)
        ))
        restarted.remove(identity: anime.identity)
        #expect(restarted.works.map(\.identity.key) == ["manga:1"])
    }

    @Test func orderedFavoritesRoundTripAndNeverGuessAmbiguousLegacyReferences() throws {
        let anime = work("1", updated: 100)
        var manga = anime
        manga.type = .manga
        let unique = work("2", updated: 100)
        let works = [anime, manga, unique]
        let references = ["manga:1", "anime:1", "2"]
        let migrated = WorkIdentity.migrate(references, in: works)
        #expect(migrated == ["manga:1", "anime:1", "anime:2"])
        #expect(WorkIdentity.migrate(migrated, in: works) == migrated)
        let profile = UserProfile(uid: "fixture", top3Favorites: migrated)
        let reloaded = try JSONDecoder().decode(UserProfile.self, from: JSONEncoder().encode(profile))
        #expect(reloaded.top3Favorites == migrated)
        #expect(reloaded.top3Favorites.compactMap { WorkIdentity.resolve($0, in: works) }.map(\.key) == migrated)
        #expect(WorkIdentity.migrate(["1", "missing", "manga:404"], in: works) == ["1", "missing", "manga:404"])
        #expect(WorkIdentity.resolve("1", in: works) == nil)
        #expect(WorkIdentity.toggling(anime.identity, in: ["1"], works: works) == ["1", "anime:1"])
        #expect(WorkIdentity.toggling(manga.identity, in: migrated, works: works) == ["anime:1", "anime:2"])
        #expect(WorkIdentity.toggling(unique.identity, in: ["manga:1", "anime:1"], works: works) == migrated)
    }
}
