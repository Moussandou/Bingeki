import FirebaseAuth
import FirebaseFunctions
import Observation

/// Real `AuthProviding` implementation — same "bingeki" Firebase project as
/// the web app (Firestore/Auth/Storage are shared across every app
/// registered in a project, so a user signed in on web and iOS is the same
/// account). Google Sign-In isn't wired yet (needs the GoogleSignIn SDK +
/// URL scheme setup); attempting it surfaces `AuthError.providerNotYetSupported`
/// instead of silently doing nothing.
@MainActor
@Observable
final class FirebaseAuthStore: AuthProviding {
    private(set) var isSignedIn: Bool
    private(set) var uid: String?
    private(set) var accountLabel: String
    private var handle: AuthStateDidChangeListenerHandle?

    init() {
        let user = Auth.auth().currentUser
        isSignedIn = user != nil
        uid = user?.uid
        accountLabel = Self.label(for: user)
        handle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            let label = Self.label(for: user)
            let signedIn = user != nil
            let uid = user?.uid
            Task { @MainActor in
                self?.isSignedIn = signedIn
                self?.uid = uid
                self?.accountLabel = label
            }
        }
    }

    private nonisolated static func label(for user: User?) -> String {
        guard let user else { return "Non connecté" }
        if user.isAnonymous { return "Invité (sans compte)" }
        let providers = Set(user.providerData.map(\.providerID))
        if providers.contains("apple.com") { return "Apple" }
        if providers.contains("google.com") { return "Google" }
        return user.email ?? "Compte Bingeki"
    }

    /// Server-side (`deleteOwnAccount` Cloud Function): the rules don't let
    /// a client delete its own profile document, and the function also
    /// removes the Auth account, so no "recent login" re-auth is needed.
    func deleteAccount() async throws {
        guard let uid else { return }
        _ = try await Functions.functions(region: "europe-west9")
            .httpsCallable("deleteOwnAccount")
            .call()
        TombstoneStore(uid: uid).clear()
        try? Auth.auth().signOut()
    }

    func signIn(with credential: AuthCredential) async throws {
        switch credential.provider {
        case .apple:
            guard let idToken = credential.identityToken, let rawNonce = credential.rawNonce else {
                throw AuthError.providerNotYetSupported("Apple")
            }
            let firebaseCredential = OAuthProvider.appleCredential(
                withIDToken: idToken,
                rawNonce: rawNonce,
                fullName: nil
            )
            _ = try await Auth.auth().signIn(with: firebaseCredential)
        case .google:
            throw AuthError.providerNotYetSupported("Google Sign-In")
        case .anonymous:
            // Real Firebase Anonymous Auth, not a local fake — a genuine
            // uid, usable with the same Firestore rules as any other
            // provider. Needs "Anonymous" enabled once in the Firebase
            // console (Authentication → Sign-in method); throws
            // `operation-not-allowed` until then, surfaced as-is below.
            _ = try await Auth.auth().signInAnonymously()
        }
    }

    func signOut() throws {
        try Auth.auth().signOut()
    }
}
