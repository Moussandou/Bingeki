import Foundation

/// Everything a screen needs from the library, behind a protocol so
/// `FirebaseLibraryStore` (Phase 1) is a drop-in replacement for
/// `InMemoryLibraryStore` — no call site changes required.
@MainActor
protocol LibraryStoring: AnyObject {
    var works: [Work] { get }
    func upsert(_ work: Work)
    func remove(id: String)
    func work(id: String) -> Work?
}

extension LibraryStoring {
    /// Works with a given status, most recently updated first — the
    /// "Reprendre"/library-tab sort everywhere in the app.
    func works(status: WorkStatus) -> [Work] {
        works.filter { $0.status == status }
            .sorted { ($0.lastUpdated ?? .distantPast) > ($1.lastUpdated ?? .distantPast) }
    }
}

/// Local, in-memory store used until Firestore sync lands (Phase 1, §8.2 of
/// the handoff doc). Seeded with sample data outside of tests so the app is
/// immediately explorable.
@MainActor
@Observable
final class InMemoryLibraryStore: LibraryStoring {
    private(set) var works: [Work]

    init(seed: [Work] = []) {
        self.works = seed
    }

    func upsert(_ work: Work) {
        if let index = works.firstIndex(where: { $0.id == work.id }) {
            works[index] = work
        } else {
            works.append(work)
        }
    }

    func remove(id: String) {
        works.removeAll { $0.id == id }
    }

    func work(id: String) -> Work? {
        works.first { $0.id == id }
    }
}

#if DEBUG
extension InMemoryLibraryStore {
    static var preview: InMemoryLibraryStore { InMemoryLibraryStore(seed: Work.sampleLibrary) }
}
#endif
