import FirebaseAuth
import FirebaseFunctions
import Observation

/// Real `AuthProviding` implementation — same "bingeki" Firebase project as
/// the web app (Firestore/Auth/Storage are shared across every app
/// registered in a project, so a user signed in on web and iOS is the same
/// account). Apple and Google tokens are obtained by `AuthView` and
/// exchanged for a Firebase credential here.
@MainActor
@Observable
final class FirebaseAuthStore: AuthProviding, AccountDeletionClient {
    private(set) var isSignedIn: Bool
    private(set) var uid: String?
    private(set) var accountLabel: String
    private var handle: AuthStateDidChangeListenerHandle?
    private let deletionFlow = AccountDeletionFlow()
    private let oauth = OAuthCredentialProvider()

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

    func deleteAccount() async throws {
        try await deletionFlow.run(client: self) { provider in
            try await self.oauth.credential(for: provider)
        }
    }

    var deletionAccount: DeletionAccount? {
        guard let user = Auth.auth().currentUser else { return nil }
        let provider = user.providerData.first { $0.providerID == "apple.com" }
            ?? user.providerData.first { $0.providerID == "google.com" }
        return DeletionAccount(
            uid: user.uid,
            provider: provider.map { $0.providerID == "apple.com" ? .apple : .google },
            providerUserID: provider?.uid
        )
    }

    func deleteRemoteAccount() async throws {
        let result = try await Functions.functions(region: "europe-west9")
            .httpsCallable("deleteOwnAccount")
            .call()
        try AccountDeletionFlow.requireServerConfirmation(result.data)
    }

    func reauthenticate(with credential: AuthCredential, account: DeletionAccount) async throws {
        guard deletionAccount == account, let user = Auth.auth().currentUser else {
            throw AccountDeletionError.wrongAccount
        }
        let firebaseCredential = try firebaseCredential(for: credential)
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            user.reauthenticate(with: firebaseCredential) { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    func refreshToken(for account: DeletionAccount) async throws {
        guard deletionAccount == account, let user = Auth.auth().currentUser else {
            throw AccountDeletionError.wrongAccount
        }
        _ = try await user.getIDToken(forcingRefresh: true)
    }

    func finishDeletion(for account: DeletionAccount) throws {
        guard deletionAccount == account else { throw AccountDeletionError.wrongAccount }
        try Auth.auth().signOut()
        TombstoneStore(uid: account.uid).clear()
    }

    func signIn(with credential: AuthCredential) async throws {
        guard !deletionFlow.isRunning else { throw AccountDeletionError.alreadyRunning }
        if credential.provider != .anonymous {
            try await completeSignIn(with: firebaseCredential(for: credential))
            return
        }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Auth.auth().signInAnonymously { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    private func firebaseCredential(for credential: AuthCredential) throws -> FirebaseAuth.AuthCredential {
        switch credential.provider {
        case .apple:
            guard let idToken = credential.identityToken, let rawNonce = credential.rawNonce else {
                throw OAuthCredentialError.missingToken
            }
            return OAuthProvider.appleCredential(
                withIDToken: idToken,
                rawNonce: rawNonce,
                fullName: nil
            )
        case .google:
            guard let idToken = credential.identityToken, let accessToken = credential.accessToken else {
                throw OAuthCredentialError.missingToken
            }
            return GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
        case .anonymous:
            throw AccountDeletionError.unsupportedProvider
        }
    }

    private func completeSignIn(with credential: FirebaseAuth.AuthCredential) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Auth.auth().signIn(with: credential) { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    func signOut() throws {
        guard !deletionFlow.isRunning else { throw AccountDeletionError.alreadyRunning }
        try Auth.auth().signOut()
    }
}
