import FirebaseFirestore
import Observation

/// Real `LibraryStoring` implementation, `/users/{uid}/data/library` in the
/// "bingeki" project — same document the web app reads/writes
/// (`src/firebase/library.ts`), so a title added on iOS shows up on web and
/// vice versa.
///
/// The document also holds web-only fields (`folders`, `viewMode`,
/// `sortBy`, `version`, `sharing`), so writes use `merge: true` and only
/// touch `works`/`deletedWorks`/`lastUpdated`/`version` — a full overwrite would wipe the
/// user's web folders on every save from the phone.
///
/// Conflicts are resolved per work, not per document: every write merges
/// the local list with the last cloud copy seen by the listener, exactly
/// like `mergeLibraryData` on the web (transactional writes are a separate
/// synchronization concern). Deletions
/// are recorded as tombstones (`TombstoneStore`) so an older cloud copy
/// can't bring a removed work back.
@MainActor
@Observable
final class FirebaseLibraryStore: LibraryStoring {
    private(set) var works: [Work] = []
    private(set) var hasLoaded = false
    private(set) var pendingChanges = 0
    private(set) var syncError: String?
    private let uid: String
    private let tombstoneStore: TombstoneStore
    private var tombstones: [Tombstone]
    /// Last list received from the server — the "cloud" side of the merge.
    private var lastRemoteWorks: [Work] = []
    /// Already-published legacy references must not be lost during a native edit.
    private var unresolvedRemoteDeletions: [Tombstone] = []
    /// Raw cloud entries by composite identity. Web works carry fields iOS doesn't model
    /// (`notes`, `rank`, `popularity`, `duration`…); writes are layered on
    /// top of these so a save from the phone never strips them.
    private var lastRemoteRaw: [WorkIdentity: [String: Any]] = [:]
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
        listener = docRef.addSnapshotListener(includeMetadataChanges: true) { [weak self] snapshot, error in
            guard let self else { return }
            if let error {
                self.hasLoaded = true
                self.syncError = error.localizedDescription
                return
            }
            guard let snapshot else { return }
            self.hasLoaded = true
            self.syncError = nil
            let pending = snapshot.metadata.hasPendingWrites
            if !pending, !snapshot.metadata.isFromCache, !self.isDebouncing {
                self.pendingChanges = 0
            }
            if !snapshot.exists, !snapshot.metadata.isFromCache { self.knowsCloudState = true }
            // Skip our own local echo.
            guard snapshot.exists, !pending else { return }
            let raw = snapshot.get("works") as? [[String: Any]] ?? []
            var remoteWorks: [Work] = []
            var rawById: [WorkIdentity: [String: Any]] = [:]
            var undecodable: [[String: Any]] = []
            for entry in raw {
                if let work = try? Firestore.Decoder().decode(Work.self, from: entry) {
                    remoteWorks.append(work)
                    rawById[work.identity] = entry
                } else {
                    undecodable.append(entry)
                }
            }
            self.lastRemoteWorks = remoteWorks
            self.lastRemoteRaw = rawById
            self.undecodableRaw = undecodable
            do {
                let remoteDeletions = try (snapshot.get("deletedWorks") as? [[String: Any]] ?? []).map {
                    try Firestore.Decoder().decode(Tombstone.self, from: $0)
                }
                self.tombstones = LibraryMerge.migrate(
                    self.tombstones + remoteDeletions, works: self.works + remoteWorks
                )
                self.unresolvedRemoteDeletions = remoteDeletions.filter {
                    $0.identity == nil && WorkIdentity.resolve($0.id, in: self.works + remoteWorks) == nil
                }
                self.tombstoneStore.save(self.tombstones)
            } catch {
                self.syncError = "Historique des suppressions illisible : \(error.localizedDescription)"
                self.knowsCloudState = false
                return
            }
            self.knowsCloudState = true
            // Don't clobber an unsent edit; the write merges with this copy.
            guard !self.isDebouncing else { return }
            // Another device may not have seen a deletion made here yet.
            self.works = remoteWorks.filter { !LibraryMerge.isDeleted($0, by: self.tombstones) }
        }
    }

    func upsert(_ work: Work) {
        var work = work
        let latestDeletion = tombstones.filter { $0.identity == work.identity }.map(\.deletedAt).max() ?? .distantPast
        let latestEdit = works.first { $0.identity == work.identity }?.lastUpdated ?? .distantPast
        work.lastUpdated = max(.now, max(latestDeletion, max(latestEdit, work.lastUpdated ?? .distantPast)).addingTimeInterval(0.001))
        if let index = works.firstIndex(where: { $0.identity == work.identity }) {
            works[index] = work
        } else {
            works.append(work)
        }
        scheduleWrite()
    }

    func remove(identity: WorkIdentity) {
        let latestEdit = (works + lastRemoteWorks).filter { $0.identity == identity }
            .compactMap(\.lastUpdated).max() ?? .distantPast
        works.removeAll { $0.identity == identity }
        tombstones = LibraryMerge.prune(tombstones + [
            Tombstone(id: identity.id, deletedAt: max(.now, latestEdit.addingTimeInterval(0.001)), type: identity.type)
        ])
        tombstoneStore.save(tombstones)
        scheduleWrite()
    }

    func work(identity: WorkIdentity) -> Work? {
        works.first { $0.identity == identity }
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
            do {
                // Undecodable entries have no reliable identity or timestamp. Preserve them.
                let encoded = try merged.map(encode) + undecodableRaw
                // Do not publish unresolved legacy tombstones as wildcards to the web.
                let deletedWorks = try (tombstones.filter { $0.identity != nil } + unresolvedRemoteDeletions).map {
                    try Firestore.Encoder().encode($0)
                }
                // Offline, this only resolves once the server acks — the
                // listener tracks local state meanwhile.
                try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                    docRef.setData([
                        "works": encoded,
                        "deletedWorks": deletedWorks,
                        "lastUpdated": Date.now.timeIntervalSince1970 * 1000,
                        "version": FieldValue.increment(Int64(1)),
                    ], merge: true) { error in
                        if let error {
                            continuation.resume(throwing: error)
                        } else {
                            continuation.resume()
                        }
                    }
                }
                syncError = nil
            } catch {
                syncError = error.localizedDescription
            }
        }
    }

    /// iOS fields layered over the raw cloud entry. The original `id` is
    /// kept as-is (web stores MAL ids as numbers and compares strictly).
    private func encode(_ work: Work) throws -> [String: Any] {
        LibraryWire.overlay(
            work, encoded: try Firestore.Encoder().encode(work),
            base: lastRemoteRaw[work.identity] ?? [:]
        )
    }
}

/// Only layer data from the same typed identity; never borrow a colliding work's web fields.
enum LibraryWire {
    static func overlay(_ work: Work, encoded: [String: Any], base: [String: Any]) -> [String: Any] {
        let sameIdentity = (base["type"] as? String) == work.type.rawValue
            && base["id"].map { "\($0)" } == work.id
        let base = sameIdentity ? base : [:]
        var entry = base.merging(encoded) { _, new in new }
        if let id = base["id"] { entry["id"] = id }
        if work.rating == nil { entry.removeValue(forKey: "rating") }
        // Genre objects can carry provider metadata beyond their modeled name.
        if let genres = base["genres"] as? [[String: Any]] {
            entry["genres"] = work.genres.map { name in
                genres.first { $0["name"] as? String == name } ?? ["name": name]
            }
        }
        return entry
    }
}
