import FirebaseAuth
import FirebaseFirestore
import Observation

/// Real `UserStoring` implementation, `/users/{uid}` in the "bingeki"
/// project (§8.2 of the handoff doc).
///
/// **Never `setDoc` the whole `UserProfile`** — the document also holds
/// server-managed fields this Swift model doesn't even declare (`badges`,
/// `isAdmin`, `email`, `lastLogin`…), and `xp`/`level`/`totalXp` are
/// derived server-side by the `onLibraryUpdate` Cloud Function trigger, the
/// same way the web's `saveUserProfileToFirestore` restricts writes to an
/// `allowedFields` list. `update(_:)` here writes only
/// `Self.clientWritableKeys` via `updateDoc`; `addXP` only ever mutates the
/// local optimistic copy (see `GamificationCore`'s doc comment on why).
@MainActor
@Observable
final class FirebaseUserStore: UserStoring {
    private(set) var profile: UserProfile
    private(set) var recentLevelUp: Int?
    private var hasProfile = false
    private var listener: ListenerRegistration?

    /// Fields a client is allowed to push straight to Firestore. Everything
    /// else on `UserProfile` (xp, level, totals…) is display-only here.
    private static let clientWritableKeys: Set<String> = [
        "displayName", "bio", "banner", "bannerPosition",
        "themeColor", "cardBgColor", "borderColor",
        "top3Favorites", "featuredBadge", "profileVisibility",
        "showActivityStatus", "hideScores", "dataSaver", "nsfwMode",
    ]

    init(uid: String) {
        profile = UserProfile(uid: uid)
        Task { await Self.ensureProfileDocument(uid: uid) }
        listener = Firestore.firestore().collection("users").document(uid)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, let snapshot, snapshot.exists else { return }
                do {
                    let previousLevel = self.profile.level
                    let updated = try snapshot.data(as: UserProfile.self)
                    // The first snapshot replaces the level-1 placeholder:
                    // that's loading, not levelling up.
                    let isFirst = !self.hasProfile
                    self.hasProfile = true
                    self.profile = updated
                    if !isFirst, updated.level > previousLevel {
                        self.recentLevelUp = updated.level
                    }
                } catch {
                    // A partial/legacy doc failed to decode — keep showing
                    // the last good value rather than crash the screen.
                }
            }
    }

    func addXP(_ amount: Int) {
        // Optimistic only: the server's onLibraryUpdate trigger recomputes
        // xp/level/totalXp from the library write that earned this XP, and
        // the snapshot listener above replaces this guess with the real
        // value moments later.
        let previousLevel = profile.level
        profile.totalXp += amount
        let result = GamificationCore.level(fromTotalXP: profile.totalXp)
        profile.level = result.level
        profile.xp = result.xp
        if result.level > previousLevel {
            recentLevelUp = result.level
        }
    }

    func update(_ mutate: (inout UserProfile) -> Void) {
        mutate(&profile)
        var payload: [String: Any] = [:]
        payload["displayName"] = profile.displayName as Any
        payload["bio"] = profile.bio as Any
        payload["banner"] = profile.banner as Any
        payload["bannerPosition"] = profile.bannerPosition as Any
        payload["themeColor"] = profile.themeColor
        payload["cardBgColor"] = profile.cardBgColor
        payload["borderColor"] = profile.borderColor
        payload["top3Favorites"] = profile.top3Favorites
        payload["featuredBadge"] = profile.featuredBadge as Any
        payload["profileVisibility"] = profile.profileVisibility.rawValue
        payload["showActivityStatus"] = profile.showActivityStatus
        payload["hideScores"] = profile.hideScores
        payload["dataSaver"] = profile.dataSaver
        payload["nsfwMode"] = profile.nsfwMode
        assert(Set(payload.keys) == Self.clientWritableKeys, "payload must match the declared allowlist exactly")

        let uid = profile.uid
        Task {
            try? await Firestore.firestore().collection("users").document(uid).setData(payload, merge: true)
        }
    }

    func clearLevelUp() {
        recentLevelUp = nil
    }

    /// Same contract as the web's `saveUserProfileToFirestore`: create the
    /// document explicitly on the very first sign-in (an iOS-only account
    /// would otherwise have no profile until its first library write), and
    /// only bump `lastLogin` afterwards. `createdAt` is set on creation only
    /// — the rules reject it on update. Email goes to the owner-only
    /// `private/contact` doc, never the world-readable profile.
    private static func ensureProfileDocument(uid: String) async {
        let ref = Firestore.firestore().collection("users").document(uid)
        let now = Date.now.timeIntervalSince1970 * 1000
        do {
            // Server source: a cache miss offline would wrongly look like
            // "no profile yet" and attempt a create over an existing doc.
            let snapshot = try await ref.getDocument(source: .server)
            if snapshot.exists {
                try await ref.setData(["lastLogin": now], merge: true)
                return
            }
            let user = Auth.auth().currentUser
            var data: [String: Any] = ["uid": uid, "createdAt": now, "lastLogin": now]
            if let name = user?.displayName, !name.isEmpty { data["displayName"] = name }
            if let photo = user?.photoURL?.absoluteString { data["photoURL"] = photo }
            try await ref.setData(data, merge: true)
            if let email = user?.email {
                try await ref.collection("private").document("contact")
                    .setData(["email": email, "updatedAt": now], merge: true)
            }
        } catch {
            // Offline on first launch: the next launch retries.
        }
    }
}
