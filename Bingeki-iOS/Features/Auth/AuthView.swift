import AuthenticationServices
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
    /// Google only: Firebase's credential needs both the ID and access tokens.
    var accessToken: String?
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
    /// How the current account signs in, for the Settings "Compte" row.
    var accountLabel: String { get }
    func signIn(with credential: AuthCredential) async throws
    func signOut() throws
    /// Deletes the account and all its data (App Store guideline 5.1.1(v)).
    func deleteAccount() async throws
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

    var accountLabel: String { isSignedIn ? "Apple" : "Non connecté" }

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

    func deleteAccount() async throws {
        try signOut()
    }
}

/// One CTA, one alternative — no form. Sign in with Apple is primary per
/// App Store guideline 4.8 (any third-party sign-in requires it as an
/// equally prominent option).
struct AuthView: View {
    @Environment(\.authStore) private var auth
    @State private var errorMessage: String?
    @State private var isSigningIn = false
    /// Generated fresh per attempt, hashed into the Apple request, kept raw
    /// for the Firebase credential exchange — standard replay-protection
    /// pattern for Sign in with Apple + Firebase.
    @State private var currentNonce: String?
    @State private var oauth = OAuthCredentialProvider()

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @State private var heroIn = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: BKSpace.lg)
            hero
            Spacer(minLength: BKSpace.xl)

            VStack(spacing: BKSpace.md) {
                SignInWithAppleButton(.signIn) { request in
                    isSigningIn = true
                    errorMessage = nil
                    let nonce = OAuthCredentialProvider.randomNonceString()
                    currentNonce = nonce
                    request.requestedScopes = [.fullName]
                    request.nonce = OAuthCredentialProvider.sha256(nonce)
                } onCompletion: { result in
                    handleApple(result)
                }
                .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                .frame(height: BKSize.ctaHeight)
                .clipShape(RoundedRectangle(cornerRadius: 0))
                .bkPanelShadow(BKColor.brandPink)
                .accessibilityIdentifier("auth_apple_button")
                .disabled(isSigningIn)

                Button {
                    Task { await signInWithGoogle() }
                } label: {
                    HStack(spacing: BKSpace.md) {
                        Image("GoogleG")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 22, height: 22)
                            .accessibilityHidden(true)
                        Text("Continuer avec Google").font(BKFont.display(17, weight: .heavy))
                    }
                    .frame(maxWidth: .infinity, minHeight: BKSize.ctaHeight)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
                }
                .bkPanelShadow()
                .foregroundStyle(BKColor.textPrimary)
                .accessibilityIdentifier("auth_google_button")
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
                .accessibilityIdentifier("auth_dev_bypass_button")
                .disabled(isSigningIn)
                #endif
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.bottom, BKSpace.xxl)
        }
        .background {
            ZStack {
                BKColor.background
                AuthHalftone().ignoresSafeArea()
            }
            .ignoresSafeArea()
        }
        .onAppear {
            guard !heroIn else { return }
            if reduceMotion { heroIn = true } else {
                withAnimation(.spring(response: 0.55, dampingFraction: 0.72).delay(0.05)) { heroIn = true }
            }
        }
    }

    // MARK: - Hero

    /// App icon on a tilted pink manga panel, then the wordmark — the same
    /// panel/ink/offset-shadow language as the S01–S09 mockups.
    private var hero: some View {
        VStack(spacing: BKSpace.xl) {
            ZStack {
                Rectangle()
                    .fill(BKColor.brandPink)
                    .overlay(AuthHalftone(color: .white.opacity(0.28), spacing: 11, dot: 3, fades: false))
                    .bkInkBorder(BKColor.ink, width: 3)
                    .bkPanelShadow(BKColor.ink, offset: 6)
                    .frame(width: 236, height: 168)
                    .rotationEffect(.degrees(heroIn ? -6 : -14))
                    .scaleEffect(heroIn ? 1 : 0.85)

                ZStack {
                    BKLogoInk().fill(Color.black, style: FillStyle(eoFill: true))
                    BKLogoBolt().fill(Self.boltRed, style: FillStyle(eoFill: true))
                        .offset(x: heroIn ? 0 : 12, y: heroIn ? 0 : -24)
                }
                .frame(width: 96 * BKLogo.aspectRatio, height: 96)
                .frame(width: 136, height: 136)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 30, style: .continuous).stroke(BKColor.ink, lineWidth: 3))
                .background(
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .fill(BKColor.ink)
                        .offset(x: 5, y: 5)
                )
                .rotationEffect(.degrees(heroIn ? 4 : 16))
                .scaleEffect(heroIn ? 1 : 0.6)
            }
            .frame(height: 200)
            .accessibilityHidden(true)

            Text("BINGEKI")
                .font(BKFont.display(48))
                .padding(.horizontal, BKSpace.lg).padding(.vertical, BKSpace.sm)
                .background(BKColor.textPrimary)
                .foregroundStyle(BKColor.background)
                .rotationEffect(.degrees(-2))
                .opacity(heroIn ? 1 : 0)
                .offset(y: heroIn ? 0 : 12)
        }
        // The icon panel is decorative; the wordmark is the readable title.
    }

    private static let boltRed = Color(red: 0.898, green: 0.118, blue: 0.165)

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        defer { currentNonce = nil }
        switch result {
        case .success(let authorization):
            do {
                let credential = try OAuthCredentialProvider.appleCredential(authorization, nonce: currentNonce)
                Task { await attempt(credential) }
            } catch {
                isSigningIn = false
                errorMessage = error.localizedDescription
                HapticEngine.failure()
            }
        case .failure(let error):
            isSigningIn = false
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

    /// Google's own sheet, then the tokens go to `auth.signIn` like Apple's.
    private func signInWithGoogle() async {
        guard !isSigningIn else { return }
        isSigningIn = true
        errorMessage = nil
        defer { isSigningIn = false }
        do {
            let credential = try await oauth.credential(for: .google)
            await attempt(credential)
        } catch AccountDeletionError.cancelled {
            return
        } catch {
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

}

/// Pink halftone backdrop, densest at the top like the web landing.
private struct AuthHalftone: View {
    var color: Color = BKColor.brandPink.opacity(0.16)
    var spacing: CGFloat = 18
    var dot: CGFloat = 3.4
    var fades = true

    var body: some View {
        Canvas { context, size in
            var y: CGFloat = 0
            var row = 0
            while y < size.height {
                var x: CGFloat = row.isMultiple(of: 2) ? 0 : spacing / 2
                while x < size.width {
                    context.fill(Path(ellipseIn: CGRect(x: x, y: y, width: dot, height: dot)), with: .color(color))
                    x += spacing
                }
                y += spacing * 0.87
                row += 1
            }
        }
        .mask {
            if fades {
                LinearGradient(colors: [.black, .black.opacity(0.35), .clear], startPoint: .top, endPoint: .bottom)
            } else {
                Color.black
            }
        }
        .accessibilityHidden(true)
    }
}

#Preview {
    AuthView().environment(\.authStore, InMemoryAuthStore())
}
