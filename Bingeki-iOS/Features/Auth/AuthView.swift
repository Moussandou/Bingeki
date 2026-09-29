import AuthenticationServices
import SwiftUI

/// Provider-agnostic result of a successful sign-in — decouples
/// `AuthProviding` from `AuthenticationServices` types (which third-party
/// code cannot construct), so both Apple and Google map onto it.
struct AuthCredential: Sendable {
    enum Provider: String, Sendable { case apple, google }
    var provider: Provider
    var userIdentifier: String
    var displayName: String?
}

/// What a screen needs from auth, behind a protocol so `FirebaseAuthStore`
/// (Phase 1, §8.1 of the handoff doc) is a drop-in replacement for
/// `InMemoryAuthStore` — same pattern as `LibraryStoring`/`UserStoring`.
@MainActor
protocol AuthProviding: AnyObject {
    var isSignedIn: Bool { get }
    func signIn(with credential: AuthCredential)
    func signOut()
}

/// Local placeholder: any successful credential flips `isSignedIn`. No
/// Keychain, no backend call yet — real token exchange with Firebase Auth
/// lands with `FirebaseAuthStore` in Phase 1.
@MainActor
@Observable
final class InMemoryAuthStore: AuthProviding {
    private(set) var isSignedIn: Bool

    init(isSignedIn: Bool = false) {
        self.isSignedIn = isSignedIn
    }

    func signIn(with credential: AuthCredential) {
        isSignedIn = true
    }

    func signOut() {
        isSignedIn = false
    }
}

/// One CTA, one alternative — no form. Sign in with Apple is primary per
/// App Store guideline 4.8 (any third-party sign-in requires it as an
/// equally prominent option); Google Sign-In SDK replaces the placeholder
/// button once Firebase lands in Phase 1.
struct AuthView: View {
    @Environment(InMemoryAuthStore.self) private var auth
    @State private var errorMessage: String?

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
                    request.requestedScopes = [.fullName]
                } onCompletion: { result in
                    handleApple(result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: BKSize.ctaHeight)
                .clipShape(RoundedRectangle(cornerRadius: 0))

                Button {
                    auth.signIn(with: AuthCredential(provider: .google, userIdentifier: UUID().uuidString))
                    HapticEngine.success()
                } label: {
                    HStack {
                        Image(systemName: "g.circle.fill")
                        Text("Continuer avec Google").font(BKFont.display(15, weight: .heavy))
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                }
                .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.border, lineWidth: 2))
                .foregroundStyle(BKColor.textPrimary)

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundStyle(.red)
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.bottom, BKSpace.xxxl)
        }
        .background(BKColor.background)
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential else { return }
            let name = [appleCredential.fullName?.givenName, appleCredential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")
            auth.signIn(with: AuthCredential(
                provider: .apple,
                userIdentifier: appleCredential.user,
                displayName: name.isEmpty ? nil : name
            ))
            HapticEngine.success()
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
}

#Preview {
    AuthView().environment(InMemoryAuthStore())
}
