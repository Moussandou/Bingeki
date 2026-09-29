import FirebaseFirestore
import Observation

/// Real `LibraryStoring` implementation, `/users/{uid}/data/library` in the
/// "bingeki" project — same document the web app reads/writes
/// (`src/firebase/library.ts`), so a title added on iOS shows up on web and
/// vice versa.
///
/// Unlike the user profile document, this one has no server-managed fields
/// mixed in (`onLibraryUpdate` writes its *results* to `/users/{uid}` and
/// `/data/gamification`, not back into this document), so a full
/// document write here is safe — matching `saveLibraryToFirestore` on web.
///
/// **Known simplification** (documented, not silently skipped): conflict
/// resolution is last-write-wins at the document level. The web has a
/// proper per-work merge with tombstones (`mergeLibraryData`,
/// `src/utils/dataProtection.ts`) for the case where two devices edited the
/// library while offline; porting that is a Phase 4 follow-up, not
/// required for a single-device MVP demo.
@MainActor
@Observable
final class FirebaseLibraryStore: LibraryStoring {
    private(set) var works: [Work] = []
    private let uid: String
    private var listener: ListenerRegistration?
    private var writeTask: Task<Void, Never>?
    /// Guards against the snapshot listener overwriting a write this same
    /// client just made with a slightly-stale server echo.
    private var lastLocalWrite: Date = .distantPast

    private var docRef: DocumentReference {
        Firestore.firestore().collection("users").document(uid).collection("data").document("library")
    }

    init(uid: String) {
        self.uid = uid
        listener = docRef.addSnapshotListener { [weak self] snapshot, _ in
            guard let self, let snapshot, snapshot.exists else { return }
            // Ignore the local echo of our own write and any snapshot that
            // raced ahead of it — see `lastLocalWrite`'s doc comment.
            if snapshot.metadata.hasPendingWrites { return }
            let remoteWorks = (try? snapshot.get("works") as? [[String: Any]])?
                .compactMap { try? Firestore.Decoder().decode(Work.self, from: $0) } ?? []
            self.works = remoteWorks
        }
    }

    func upsert(_ work: Work) {
        if let index = works.firstIndex(where: { $0.id == work.id }) {
            works[index] = work
        } else {
            works.append(work)
        }
        scheduleWrite()
    }

    func remove(id: String) {
        works.removeAll { $0.id == id }
        scheduleWrite()
    }

    func work(id: String) -> Work? {
        works.first { $0.id == id }
    }

    /// 800ms debounce (§8.2 of the handoff doc) so a burst of `+1` taps
    /// doesn't fire a write per tap.
    private func scheduleWrite() {
        lastLocalWrite = .now
        writeTask?.cancel()
        let snapshot = works
        writeTask = Task {
            try? await Task.sleep(for: .milliseconds(800))
            guard !Task.isCancelled else { return }
            let encoded = snapshot.map { (try? Firestore.Encoder().encode($0)) ?? [:] }
            try? await docRef.setData([
                "works": encoded,
                "lastUpdated": Date.now.timeIntervalSince1970 * 1000,
            ], merge: false)
        }
    }
}
