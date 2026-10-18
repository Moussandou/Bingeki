import AuthenticationServices
import CryptoKit
import FirebaseCore
import GoogleSignIn
import UIKit

enum OAuthCredentialError: LocalizedError {
    case unavailable, missingToken

    var errorDescription: String? {
        switch self {
        case .unavailable: return "La connexion est indisponible pour le moment. Réessaie."
        case .missingToken: return "Le fournisseur n'a pas confirmé ton identité. Réessaie."
        }
    }
}

@MainActor
final class OAuthCredentialProvider: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<AuthCredential, Error>?
    private var controller: ASAuthorizationController?
    private var window: UIWindow?
    private var nonce: String?

    func credential(for provider: AuthCredential.Provider) async throws -> AuthCredential {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .filter({ $0.activationState == .foregroundActive })
            .compactMap(\.keyWindow).first else { throw OAuthCredentialError.unavailable }
        switch provider {
        case .apple:
            guard continuation == nil else { throw AccountDeletionError.alreadyRunning }
            self.window = window
            let nonce = Self.randomNonceString()
            self.nonce = nonce
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.nonce = Self.sha256(nonce)
            return try await withCheckedThrowingContinuation { continuation in
                self.continuation = continuation
                let controller = ASAuthorizationController(authorizationRequests: [request])
                self.controller = controller
                controller.delegate = self
                controller.presentationContextProvider = self
                controller.performRequests()
            }
        case .google:
            guard let clientID = FirebaseApp.app()?.options.clientID,
                  var presenter = window.rootViewController else { throw OAuthCredentialError.unavailable }
            while let presented = presenter.presentedViewController { presenter = presented }
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
            do {
                return try await withCheckedThrowingContinuation { continuation in
                    GIDSignIn.sharedInstance.signIn(withPresenting: presenter) { result, error in
                        if let error {
                            continuation.resume(throwing: error)
                            return
                        }
                        guard let result, let token = result.user.idToken?.tokenString,
                              let userID = result.user.userID else {
                            continuation.resume(throwing: OAuthCredentialError.missingToken)
                            return
                        }
                        continuation.resume(returning: AuthCredential(
                            provider: .google, userIdentifier: userID,
                            displayName: result.user.profile?.name, identityToken: token,
                            accessToken: result.user.accessToken.tokenString
                        ))
                    }
                }
            } catch {
                let nsError = error as NSError
                if nsError.domain == kGIDSignInErrorDomain, nsError.code == GIDSignInError.canceled.rawValue {
                    throw AccountDeletionError.cancelled
                }
                throw error
            }
        case .anonymous:
            throw AccountDeletionError.unsupportedProvider
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Retained from the foreground scene before starting the request.
        window!
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { reset() }
        do {
            continuation?.resume(returning: try Self.appleCredential(authorization, nonce: nonce))
        } catch {
            continuation?.resume(throwing: error)
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { reset() }
        let nsError = error as NSError
        if nsError.domain == ASAuthorizationError.errorDomain, nsError.code == ASAuthorizationError.canceled.rawValue {
            continuation?.resume(throwing: AccountDeletionError.cancelled)
        } else {
            continuation?.resume(throwing: error)
        }
    }

    private func reset() {
        continuation = nil
        controller = nil
        window = nil
        nonce = nil
    }

    static func appleCredential(_ authorization: ASAuthorization, nonce: String?) throws -> AuthCredential {
        guard let apple = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = apple.identityToken, let token = String(data: data, encoding: .utf8),
              let nonce else { throw OAuthCredentialError.missingToken }
        let name = [apple.fullName?.givenName, apple.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
        return AuthCredential(
            provider: .apple, userIdentifier: apple.user,
            displayName: name.isEmpty ? nil : name, identityToken: token, rawNonce: nonce
        )
    }

    static func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var bytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed: \(status)")
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
