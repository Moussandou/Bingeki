import FirebaseFirestore
import Observation

/// Real `LibraryStoring` implementation, `/users/{uid}/data/library` in the
/// "bingeki" project — same document the web app reads/writes
/// (`src/firebase/library.ts`), so a title added on iOS shows up on web and
/// vice versa.
///
/// The document also holds web-only fields (`folders`, `viewMode`,
/// `sortBy`, `version`, `sharing`), so writes use `merge: true` and only
/// touch `works`/`lastUpdated`/`version` — a full overwrite would wipe the
/// user's web folders on every save from the phone.
///
/// Conflicts are resolved per work, not per document: every write merges
/// the local list with the last cloud copy seen by the listener, exactly
/// like `saveLibraryToFirestore` + `mergeLibraryData` on the web. Deletions
/// are recorded as tombstones (`TombstoneStore`) so an older cloud copy
/// can't bring a removed work back.
@MainActor
@Observable
final class FirebaseLibraryStore: LibraryStoring {
    private(set) var works: [Work] = []
    private(set) var hasLoaded = false
    private(set) var pendingChanges = 0
    private let uid: String
    private let tombstoneStore: TombstoneStore
    private var tombstones: [Tombstone]
    /// Last list received from the server — the "cloud" side of the merge.
    private var lastRemoteWorks: [Work] = []
    private var listener: ListenerRegistration?
    private var writeTask: Task<Void, Never>?
    /// True during the debounce window, so a remote snapshot can't clobber
    /// edits that haven't been sent yet.
    private var isDebouncing = false

    private var docRef: DocumentReference {
        Firestore.firestore().collection("users").document(uid).collection("data").document("library")
    }

    init(uid: String) {
        self.uid = uid
        self.tombstoneStore = TombstoneStore(uid: uid)
        self.tombstones = tombstoneStore.load()
        // Metadata changes included so we see pending → acknowledged transitions.
        listener = docRef.addSnapshotListener(includeMetadataChanges: true) { [weak self] snapshot, _ in
            guard let self, let snapshot else { return }
            self.hasLoaded = true
            let pending = snapshot.metadata.hasPendingWrites
            if !pending, !snapshot.metadata.isFromCache, !self.isDebouncing {
                self.pendingChanges = 0
            }
            // Skip our own local echo and anything racing an unsent edit.
            guard snapshot.exists, !pending, !self.isDebouncing else { return }
            let remoteWorks = (snapshot.get("works") as? [[String: Any]])?
                .compactMap { try? Firestore.Decoder().decode(Work.self, from: $0) } ?? []
            self.lastRemoteWorks = remoteWorks
            // Another device may not have seen a deletion made here yet.
            self.works = remoteWorks.filter { !LibraryMerge.isDeleted($0, by: self.tombstones) }
        }
    }

    func upsert(_ work: Work) {
        var work = work
        work.lastUpdated = .now
        if let index = works.firstIndex(where: { $0.id == work.id }) {
            works[index] = work
        } else {
            works.append(work)
        }
        scheduleWrite()
    }

    func remove(id: String) {
        works.removeAll { $0.id == id }
        tombstones.append(Tombstone(id: id, deletedAt: .now))
        tombstoneStore.save(tombstones)
        scheduleWrite()
    }

    func work(id: String) -> Work? {
        works.first { $0.id == id }
    }

    /// 800ms debounce (§8.2 of the handoff doc) so a burst of `+1` taps
    /// doesn't fire a write per tap.
    private func scheduleWrite() {
        pendingChanges += 1
        isDebouncing = true
        writeTask?.cancel()
        writeTask = Task {
            try? await Task.sleep(for: .milliseconds(800))
            guard !Task.isCancelled else { return }
            isDebouncing = false
            let merged = LibraryMerge.merge(local: works, cloud: lastRemoteWorks, tombstones: tombstones)
            works = merged
            let encoded = merged.map { (try? Firestore.Encoder().encode($0)) ?? [:] }
            // Offline, this only resolves once the server acks — the
            // listener tracks local state meanwhile.
            try? await docRef.setData([
                "works": encoded,
                "lastUpdated": Date.now.timeIntervalSince1970 * 1000,
                "version": FieldValue.increment(Int64(1)),
            ], merge: true)
        }
    }
}
