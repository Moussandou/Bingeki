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
    /// Raw cloud entries by id. Web works carry fields iOS doesn't model
    /// (`notes`, `rank`, `popularity`, `duration`…); writes are layered on
    /// top of these so a save from the phone never strips them.
    private var lastRemoteRaw: [String: [String: Any]] = [:]
    /// Cloud entries `Work` couldn't decode. Written back untouched — never
    /// silently dropped from the user's library.
    private var undecodableRaw: [[String: Any]] = []
    /// False until the cloud list is known (or known not to exist). Writing
    /// before that would merge against an empty cloud and wipe the library.
    private var knowsCloudState = false
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
            if !snapshot.exists, !snapshot.metadata.isFromCache { self.knowsCloudState = true }
            // Skip our own local echo.
            guard snapshot.exists, !pending else { return }
            let raw = snapshot.get("works") as? [[String: Any]] ?? []
            var remoteWorks: [Work] = []
            var rawById: [String: [String: Any]] = [:]
            var undecodable: [[String: Any]] = []
            for entry in raw {
                if let work = try? Firestore.Decoder().decode(Work.self, from: entry) {
                    remoteWorks.append(work)
                    rawById[work.id] = entry
                } else {
                    undecodable.append(entry)
                }
            }
            self.lastRemoteWorks = remoteWorks
            self.lastRemoteRaw = rawById
            self.undecodableRaw = undecodable
            self.knowsCloudState = true
            // Don't clobber an unsent edit; the write merges with this copy.
            guard !self.isDebouncing else { return }
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
            while !knowsCloudState, !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(300))
            }
            guard !Task.isCancelled else { return }
            isDebouncing = false
            let merged = LibraryMerge.merge(local: works, cloud: lastRemoteWorks, tombstones: tombstones)
            works = merged
            let encoded = merged.map(encode) + undecodableRaw.filter { entry in
                guard let id = entry["id"].map({ "\($0)" }) else { return true }
                return !tombstones.contains { $0.id == id }
            }
            // Offline, this only resolves once the server acks — the
            // listener tracks local state meanwhile.
            try? await docRef.setData([
                "works": encoded,
                "lastUpdated": Date.now.timeIntervalSince1970 * 1000,
                "version": FieldValue.increment(Int64(1)),
            ], merge: true)
        }
    }

    /// iOS fields layered over the raw cloud entry. The original `id` is
    /// kept as-is (web stores MAL ids as numbers and compares strictly).
    private func encode(_ work: Work) -> [String: Any] {
        let base = lastRemoteRaw[work.id] ?? [:]
        var entry = base.merging((try? Firestore.Encoder().encode(work)) ?? [:]) { _, new in new }
        if let id = base["id"] { entry["id"] = id }
        // Clearing the rating on iOS must clear it on web too.
        if work.rating == nil { entry.removeValue(forKey: "rating") }
        return entry
    }
}
