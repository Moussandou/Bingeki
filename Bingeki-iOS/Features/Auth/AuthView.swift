import AuthenticationServices
import CryptoKit
import SwiftUI

/// Provider-agnostic result of a successful sign-in — decouples
/// `AuthProviding` from `AuthenticationServices` types (which third-party
/// code cannot construct), so both Apple and Google map onto it.
///
/// `identityToken`/`rawNonce` are Apple-specific and only populated for
/// `.apple` — `FirebaseAuthStore` needs both to build the real Firebase
/// credential (`OAuthProvider.appleCredential`); `InMemoryAuthStore` ignores
/// them entirely.
struct AuthCredential: Sendable {
    enum Provider: String, Sendable { case apple, google, anonymous }
    var provider: Provider
    var userIdentifier: String
    var displayName: String?
    var identityToken: String?
    var rawNonce: String?
}

/// What a screen needs from auth, behind a protocol so `FirebaseAuthStore`
/// is a drop-in replacement for `InMemoryAuthStore` — same pattern as
/// `LibraryStoring`/`UserStoring`. `async throws` because the real
/// implementation makes a network call that can fail.
@MainActor
protocol AuthProviding: AnyObject {
    var isSignedIn: Bool { get }
    /// Non-nil exactly when `isSignedIn` is true. `SignedInRootView` uses
    /// this to construct the Firestore-backed `libraryStore`/`userStore`
    /// for that specific account.
    var uid: String? { get }
    func signIn(with credential: AuthCredential) async throws
    func signOut() throws
}

enum AuthError: LocalizedError {
    case providerNotYetSupported(String)

    var errorDescription: String? {
        switch self {
        case .providerNotYetSupported(let name): return "\(name) arrive bientôt."
        }
    }
}

/// Local placeholder for previews/tests: any successful credential flips
/// `isSignedIn`, no network call. `FirebaseAuthStore` is the real
/// implementation used by the app itself.
@MainActor
@Observable
final class InMemoryAuthStore: AuthProviding {
    private(set) var isSignedIn: Bool
    private(set) var uid: String?

    init(isSignedIn: Bool = false) {
        self.isSignedIn = isSignedIn
        self.uid = isSignedIn ? "preview-user" : nil
    }

    func signIn(with credential: AuthCredential) async throws {
        isSignedIn = true
        uid = credential.userIdentifier
    }

    func signOut() throws {
        isSignedIn = false
        uid = nil
    }
}

/// One CTA, one alternative — no form. Sign in with Apple is primary per
/// App Store guideline 4.8 (any third-party sign-in requires it as an
/// equally prominent option); the Google button is disabled until the
/// GoogleSignIn SDK is added (see `AuthError.providerNotYetSupported`).
struct AuthView: View {
    @Environment(\.authStore) private var auth
    @State private var errorMessage: String?
    @State private var isSigningIn = false
    /// Generated fresh per attempt, hashed into the Apple request, kept raw
    /// for the Firebase credential exchange — standard replay-protection
    /// pattern for Sign in with Apple + Firebase.
    @State private var currentNonce: String?

    var body: some View {
        VStack(spacing: BKSpace.xxl) {
            Spacer()

            VStack(spacing: BKSpace.md) {
                Text("BINGEKI")
                    .font(BKFont.display(48))
                    .padding(.horizontal, BKSpace.lg).padding(.vertical, BKSpace.sm)
                    .background(BKColor.textPrimary)
                    .foregroundStyle(BKColor.background)
                    .rotationEffect(.degrees(-1))
                Text("Ton binge, dans le pouce.")
                    .font(.subheadline)
                    .foregroundStyle(BKColor.textSecondary)
            }

            Spacer()

            VStack(spacing: BKSpace.md) {
                SignInWithAppleButton(.signIn) { request in
                    let nonce = Self.randomNonceString()
                    currentNonce = nonce
                    request.requestedScopes = [.fullName]
                    request.nonce = Self.sha256(nonce)
                } onCompletion: { result in
                    handleApple(result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: BKSize.ctaHeight)
                .clipShape(RoundedRectangle(cornerRadius: 0))
                .disabled(isSigningIn)

                Button {
                    Task { await attempt(AuthCredential(provider: .google, userIdentifier: UUID().uuidString)) }
                } label: {
                    HStack {
                        Image(systemName: "g.circle.fill")
                        Text("Continuer avec Google").font(BKFont.display(15, weight: .heavy))
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                }
                .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.border, lineWidth: 2))
                .foregroundStyle(BKColor.textPrimary)
                .disabled(isSigningIn)

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundStyle(.red)
                }

                #if DEBUG
                // Sign in with Apple needs a paid Apple Developer Team bound
                // to this project (DEVELOPMENT_TEAM isn't set — see
                // project.yml) to actually complete on Simulator; this uses
                // Firebase's real Anonymous Auth provider so the rest of the
                // app is reachable without one. Requires the "Anonymous"
                // sign-in method enabled once in the Firebase console
                // (console.firebase.google.com/project/bingeki/authentication/providers).
                Button {
                    Task { await attempt(AuthCredential(provider: .anonymous, userIdentifier: UUID().uuidString)) }
                } label: {
                    Text("Continuer sans compte (dev)")
                        .font(.footnote.weight(.semibold))
                        .underline()
                }
                .foregroundStyle(BKColor.textSecondary)
                .disabled(isSigningIn)
                #endif
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.bottom, BKSpace.xxxl)
        }
        .background(BKColor.background)
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = appleCredential.identityToken,
                  let tokenString = String(data: tokenData, encoding: .utf8) else { return }
            let name = [appleCredential.fullName?.givenName, appleCredential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")
            Task {
                await attempt(AuthCredential(
                    provider: .apple,
                    userIdentifier: appleCredential.user,
                    displayName: name.isEmpty ? nil : name,
                    identityToken: tokenString,
                    rawNonce: currentNonce
                ))
            }
        case .failure(let error):
            // `.canceled` fires every time the user backs out of the Apple
            // sheet — not a real error, so it shouldn't paint the UI red.
            let nsError = error as NSError
            if nsError.domain == ASAuthorizationError.errorDomain,
               nsError.code == ASAuthorizationError.canceled.rawValue {
                return
            }
            errorMessage = error.localizedDescription
            HapticEngine.failure()
        }
    }

    private func attempt(_ credential: AuthCredential) async {
        isSigningIn = true
        errorMessage = nil
        do {
            try await auth.signIn(with: credential)
            HapticEngine.success()
        } catch {
            errorMessage = error.localizedDescription
            HapticEngine.failure()
        }
        isSigningIn = false
    }

    // MARK: - Nonce (Apple + Firebase replay protection)

    private static func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed with OSStatus \(status)")
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

#Preview {
    AuthView().environment(\.authStore, InMemoryAuthStore())
}
