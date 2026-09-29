import FirebaseAuth
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
    private var handle: AuthStateDidChangeListenerHandle?

    init() {
        let user = Auth.auth().currentUser
        isSignedIn = user != nil
        uid = user?.uid
        handle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.isSignedIn = user != nil
                self?.uid = user?.uid
            }
        }
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
