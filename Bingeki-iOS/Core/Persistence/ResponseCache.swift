import Foundation
import SwiftData

/// Last good Tenrai payload for a request, kept on disk so catalogue screens
/// (fiche, Découvrir, Parcourir, recherche) still render offline.
///
/// The library itself isn't here: Firestore's own persistent cache already
/// serves it offline and queues writes until the network is back — a second
/// queue on top would fight it.
@Model
final class CachedResponse {
    @Attribute(.unique) var key: String
    var data: Data
    var fetchedAt: Date

    init(key: String, data: Data, fetchedAt: Date = .now) {
        self.key = key
        self.data = data
        self.fetchedAt = fetchedAt
    }
}

@ModelActor
actor ResponseCache {
    static let shared: ResponseCache? = {
        guard let container = try? ModelContainer(for: CachedResponse.self) else { return nil }
        return ResponseCache(modelContainer: container)
    }()

    /// Entries older than this are dropped at launch; a month-old fiche is
    /// still better than an error screen, older than that it's noise.
    static let maxAge: TimeInterval = 30 * 24 * 3600

    static func inMemory() throws -> ResponseCache {
        let container = try ModelContainer(
            for: CachedResponse.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        return ResponseCache(modelContainer: container)
    }

    func data(for key: String) -> Data? {
        var descriptor = FetchDescriptor<CachedResponse>(predicate: #Predicate { $0.key == key })
        descriptor.fetchLimit = 1
        return (try? modelContext.fetch(descriptor))?.first?.data
    }

    func store(_ data: Data, for key: String, at date: Date = .now) {
        var descriptor = FetchDescriptor<CachedResponse>(predicate: #Predicate { $0.key == key })
        descriptor.fetchLimit = 1
        if let existing = (try? modelContext.fetch(descriptor))?.first {
            existing.data = data
            existing.fetchedAt = date
        } else {
            modelContext.insert(CachedResponse(key: key, data: data, fetchedAt: date))
        }
        try? modelContext.save()
    }

    func prune(now: Date = .now) {
        let cutoff = now.addingTimeInterval(-Self.maxAge)
        try? modelContext.delete(model: CachedResponse.self, where: #Predicate { $0.fetchedAt < cutoff })
        try? modelContext.save()
    }
}
