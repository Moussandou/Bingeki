import FirebaseFunctions
import Foundation

struct DeletionAccount: Equatable {
    let uid: String
    let provider: AuthCredential.Provider?
    let providerUserID: String?
}

enum AccountDeletionError: LocalizedError, Equatable {
    case signedOut, alreadyRunning, unsupportedProvider, wrongAccount, cancelled, invalidResponse

    var errorDescription: String? {
        switch self {
        case .signedOut: return "Reconnecte-toi avant de supprimer ton compte."
        case .alreadyRunning: return "Une suppression est déjà en cours."
        case .unsupportedProvider: return "Reconnecte-toi avec le fournisseur de ce compte, puis réessaie."
        case .wrongAccount: return "Utilise le même compte Apple ou Google. La suppression n'a pas été relancée."
        case .cancelled: return "Vérification annulée. La suppression n'a pas été relancée."
        case .invalidResponse: return "Le serveur n'a pas confirmé la suppression. Réessaie."
        }
    }
}

@MainActor
protocol AccountDeletionClient: AnyObject {
    var deletionAccount: DeletionAccount? { get }
    func deleteRemoteAccount() async throws
    func reauthenticate(with credential: AuthCredential, account: DeletionAccount) async throws
    func refreshToken(for account: DeletionAccount) async throws
    func finishDeletion(for account: DeletionAccount) throws
}

@MainActor
final class AccountDeletionFlow {
    private(set) var isRunning = false

    static func requiresRecentLogin(_ error: Error) -> Bool {
        let error = error as NSError
        return error.domain == FunctionsErrorDomain
            && error.code == FunctionsErrorCode.failedPrecondition.rawValue
            && (error.userInfo[FunctionsErrorDetailsKey] as? [String: Any])?["reason"] as? String
                == "requires-recent-login"
    }

    static func requireServerConfirmation(_ data: Any) throws {
        guard let data = data as? [String: Any], data["ok"] as? Bool == true else {
            throw AccountDeletionError.invalidResponse
        }
    }

    func run(
        client: any AccountDeletionClient,
        credential: @MainActor (AuthCredential.Provider) async throws -> AuthCredential
    ) async throws {
        guard !isRunning else { throw AccountDeletionError.alreadyRunning }
        guard let account = client.deletionAccount else { throw AccountDeletionError.signedOut }
        isRunning = true
        defer { isRunning = false }

        try Task.checkCancellation()
        do {
            try await client.deleteRemoteAccount()
        } catch {
            guard Self.requiresRecentLogin(error) else { throw error }
            try checkAccount(account, client: client)
            guard let provider = account.provider, provider != .anonymous,
                  let providerID = account.providerUserID else {
                throw AccountDeletionError.unsupportedProvider
            }
            let renewed = try await credential(provider)
            try Task.checkCancellation()
            try checkAccount(account, client: client)
            guard renewed.provider == provider, renewed.userIdentifier == providerID else {
                throw AccountDeletionError.wrongAccount
            }
            try await client.reauthenticate(with: renewed, account: account)
            try checkAccount(account, client: client)
            try await client.refreshToken(for: account)
            try Task.checkCancellation()
            try checkAccount(account, client: client)
            // Deliberately outside the first catch: a second refusal never loops.
            try await client.deleteRemoteAccount()
        }
        try checkAccount(account, client: client)
        try client.finishDeletion(for: account)
    }

    private func checkAccount(_ account: DeletionAccount, client: any AccountDeletionClient) throws {
        guard client.deletionAccount == account else { throw AccountDeletionError.wrongAccount }
    }
}
