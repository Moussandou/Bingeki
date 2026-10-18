import Foundation

/// A deletion made on this device, so the cloud copy can't resurrect the
/// work on the next sync. Mirrors `Tombstone` in `src/store/libraryStore.ts`.
struct Tombstone: Codable, Equatable, Sendable {
    var id: String
    var deletedAt: Date
}

/// Port of the web's `mergeLibraryData` (`src/utils/dataProtection.ts`):
/// per-work last-write-wins instead of overwriting the whole document, plus
/// tombstones so a deletion isn't undone by an older cloud copy.
enum LibraryMerge {
    /// Deletions older than this are assumed propagated to every device —
    /// same TTL as the web (`TOMBSTONE_TTL_MS`).
    static let tombstoneTTL: TimeInterval = 90 * 24 * 60 * 60

    static func prune(_ tombstones: [Tombstone], now: Date = .now) -> [Tombstone] {
        tombstones.filter { now.timeIntervalSince($0.deletedAt) < tombstoneTTL }
    }

    /// A deletion only wins over a cloud edit that predates it.
    static func isDeleted(_ work: Work, by tombstones: [Tombstone]) -> Bool {
        guard let deletedAt = tombstones.filter({ $0.id == work.id }).map(\.deletedAt).max() else {
            return false
        }
        return (work.lastUpdated ?? .distantPast) <= deletedAt
    }

    /// Local order preserved, cloud-only additions appended; on a conflict
    /// the most recently updated copy of a work wins (local on a tie).
    static func merge(local: [Work], cloud: [Work], tombstones: [Tombstone]) -> [Work] {
        let survivingCloud = cloud.filter { !isDeleted($0, by: tombstones) }
        if survivingCloud.isEmpty { return local }
        if local.isEmpty { return survivingCloud }

        var byId: [String: Work] = [:]
        for work in survivingCloud { byId[work.id] = work }
        for work in local {
            if let existing = byId[work.id],
               (work.lastUpdated ?? .distantPast) < (existing.lastUpdated ?? .distantPast) {
                continue
            }
            byId[work.id] = work
        }

        var merged: [Work] = []
        var seen = Set<String>()
        for work in local + survivingCloud where !seen.contains(work.id) {
            if let upToDate = byId[work.id] {
                merged.append(upToDate)
                seen.insert(work.id)
            }
        }
        return merged
    }
}

/// Tombstones live on the device only (the web keeps them in its persisted
/// zustand store too), keyed by account so two users on one phone don't
/// share deletions.
struct TombstoneStore {
    private let key: String
    private let defaults: UserDefaults

    init(uid: String, defaults: UserDefaults = .standard) {
        self.key = "bk.tombstones.\(uid)"
        self.defaults = defaults
    }

    func load() -> [Tombstone] {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([Tombstone].self, from: data) else { return [] }
        return LibraryMerge.prune(decoded)
    }

    func save(_ tombstones: [Tombstone]) {
        let pruned = LibraryMerge.prune(tombstones)
        defaults.set(try? JSONEncoder().encode(pruned), forKey: key)
    }

    func clear() {
        defaults.removeObject(forKey: key)
    }
}
