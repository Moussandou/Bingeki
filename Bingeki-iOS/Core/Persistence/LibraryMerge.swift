import Foundation
import OSLog

/// Web wire format: { id, type?, deletedAt: epochMilliseconds }.
/// Missing type is retained until the legacy reference can be resolved uniquely.
struct Tombstone: Codable, Equatable, Sendable {
    static let legacyDatesKey = CodingUserInfoKey(rawValue: "bk.legacyTombstoneDates")!
    var id: String
    var deletedAt: Date
    var type: WorkType? = nil

    var identity: WorkIdentity? {
        type.map { WorkIdentity(type: $0, id: id) } ?? WorkIdentity(key: id)
    }

    private enum CodingKeys: String, CodingKey { case id, type, deletedAt }

    init(id: String, deletedAt: Date, type: WorkType? = nil) {
        self.id = id
        self.deletedAt = deletedAt
        self.type = type
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let string = try? c.decode(String.self, forKey: .id) {
            id = string
        } else {
            id = String(try c.decode(Int.self, forKey: .id))
        }
        type = try c.decodeIfPresent(WorkType.self, forKey: .type)
        let timestamp = try c.decode(Double.self, forKey: .deletedAt)
        // v1 native UserDefaults used JSONEncoder's seconds since 2001.
        if decoder.userInfo[Self.legacyDatesKey] as? Bool == true {
            deletedAt = Date(timeIntervalSinceReferenceDate: timestamp)
        } else {
            deletedAt = Date(timeIntervalSince1970: timestamp / 1000)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encodeIfPresent(type, forKey: .type)
        try c.encode(deletedAt.timeIntervalSince1970 * 1000, forKey: .deletedAt)
    }
}

enum LibraryMerge {
    /// Keep deletion history indefinitely, matching web: offline clients may return years later.
    static func prune(_ tombstones: [Tombstone], now: Date = .now) -> [Tombstone] {
        var result: [Tombstone] = []
        var indices: [String: Int] = [:]
        for tombstone in tombstones {
            let key = tombstone.identity?.key ?? "legacy:\(tombstone.id)"
            if let index = indices[key] {
                if result[index].deletedAt < tombstone.deletedAt { result[index] = tombstone }
            } else {
                indices[key] = result.count
                result.append(tombstone)
            }
        }
        return result
    }

    static func migrate(_ tombstones: [Tombstone], works: [Work]) -> [Tombstone] {
        prune(tombstones.map { tombstone in
            guard let identity = tombstone.identity ?? WorkIdentity.resolve(tombstone.id, in: works) else {
                return tombstone
            }
            return Tombstone(id: identity.id, deletedAt: tombstone.deletedAt, type: identity.type)
        })
    }

    /// Unresolved legacy deletions are not wildcards: they must never delete both types.
    static func isDeleted(_ work: Work, by tombstones: [Tombstone]) -> Bool {
        guard let deletedAt = tombstones.filter({ $0.identity == work.identity }).map(\.deletedAt).max() else {
            return false
        }
        return (work.lastUpdated ?? .distantPast) <= deletedAt
    }

    /// Local order and tie preference match the web; both sides honor deletions.
    static func merge(local: [Work], cloud: [Work], tombstones: [Tombstone]) -> [Work] {
        let deletions = migrate(tombstones, works: local + cloud)
        var byIdentity: [WorkIdentity: Work] = [:]
        for work in cloud + local where !isDeleted(work, by: deletions) {
            if let existing = byIdentity[work.identity],
               (work.lastUpdated ?? .distantPast) < (existing.lastUpdated ?? .distantPast) {
                continue
            }
            byIdentity[work.identity] = work
        }
        var seen = Set<WorkIdentity>()
        return (local + cloud).compactMap { work in
            guard seen.insert(work.identity).inserted else { return nil }
            return byIdentity[work.identity]
        }
    }
}

struct TombstoneStore {
    private struct Archive: Codable {
        var version: Int = 2
        var tombstones: [Tombstone]
    }

    private let key: String
    private let defaults: UserDefaults
    private let logger = Logger(subsystem: "com.bingeki.ios", category: "Tombstones")

    init(uid: String, defaults: UserDefaults = .standard) {
        self.key = "bk.tombstones.\(uid)"
        self.defaults = defaults
    }

    func load() -> [Tombstone] {
        guard let data = defaults.data(forKey: key) else { return [] }
        do {
            let decoder = JSONDecoder()
            if let archive = try? decoder.decode(Archive.self, from: data) {
                guard archive.version == 2 else { throw CocoaError(.coderReadCorrupt) }
                return LibraryMerge.prune(archive.tombstones)
            }
            decoder.userInfo[Tombstone.legacyDatesKey] = true
            return LibraryMerge.prune(try decoder.decode([Tombstone].self, from: data))
        } catch {
            logger.error("Cannot decode deletion history: \(error.localizedDescription)")
            return []
        }
    }

    func save(_ tombstones: [Tombstone]) {
        do {
            defaults.set(try JSONEncoder().encode(Archive(tombstones: LibraryMerge.prune(tombstones))), forKey: key)
        } catch {
            logger.error("Cannot save deletion history: \(error.localizedDescription)")
        }
    }

    func clear() {
        defaults.removeObject(forKey: key)
    }
}
