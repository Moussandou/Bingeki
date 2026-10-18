import Foundation

/// Everything a screen needs from the library, behind a protocol so
/// `FirebaseLibraryStore` (Phase 1) is a drop-in replacement for
/// `InMemoryLibraryStore` — no call site changes required.
@MainActor
protocol LibraryStoring: AnyObject {
    var works: [Work] { get }
    /// False until the first remote snapshot lands — avoids flashing empty states.
    var hasLoaded: Bool { get }
    /// Local edits not yet acknowledged by the server (offline banner).
    var pendingChanges: Int { get }
    func upsert(_ work: Work)
    func remove(identity: WorkIdentity)
    func work(identity: WorkIdentity) -> Work?
}

extension LibraryStoring {
    var pendingChanges: Int { 0 }

    /// Compatibility for persisted references only; never use a raw ID for a mutation.
    func work(id: String) -> Work? {
        guard let identity = WorkIdentity.resolve(id, in: works) else { return nil }
        return work(identity: identity)
    }

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
    var hasLoaded: Bool { true }

    init(seed: [Work] = []) {
        self.works = seed
    }

    func upsert(_ work: Work) {
        if let index = works.firstIndex(where: { $0.identity == work.identity }) {
            works[index] = work
        } else {
            works.append(work)
        }
    }

    func remove(identity: WorkIdentity) {
        works.removeAll { $0.identity == identity }
    }

    func work(identity: WorkIdentity) -> Work? {
        works.first { $0.identity == identity }
    }
}

extension InMemoryLibraryStore {
    static var preview: InMemoryLibraryStore { InMemoryLibraryStore(seed: Work.sampleLibrary) }
}
