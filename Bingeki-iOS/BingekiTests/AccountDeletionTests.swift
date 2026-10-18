import FirebaseFunctions
import Foundation
import Testing
@testable import Bingeki

@MainActor
struct AccountDeletionTests {
    private func recentLogin(
        domain: String = FunctionsErrorDomain,
        code: Int = FunctionsErrorCode.failedPrecondition.rawValue,
        reason: String = "requires-recent-login"
    ) -> NSError {
        NSError(domain: domain, code: code, userInfo: [FunctionsErrorDetailsKey: ["reason": reason]])
    }

    @Test func preciseServerErrorRecognition() {
        #expect(AccountDeletionFlow.requiresRecentLogin(recentLogin()))
        #expect(!AccountDeletionFlow.requiresRecentLogin(recentLogin(domain: "network")))
        #expect(!AccountDeletionFlow.requiresRecentLogin(recentLogin(code: FunctionsErrorCode.internal.rawValue)))
        #expect(!AccountDeletionFlow.requiresRecentLogin(recentLogin(reason: "another-precondition")))
        #expect(!AccountDeletionFlow.requiresRecentLogin(NSError(
            domain: FunctionsErrorDomain, code: FunctionsErrorCode.failedPrecondition.rawValue,
            userInfo: [NSLocalizedDescriptionKey: "requires-recent-login"]
        )))
    }

    @Test func successRequiresExplicitServerConfirmation() throws {
        try AccountDeletionFlow.requireServerConfirmation(["ok": true])
        for response: Any in [[:], ["ok": false], ["ok": "true"], NSNull(), "ok"] {
            #expect(throws: AccountDeletionError.invalidResponse) {
                try AccountDeletionFlow.requireServerConfirmation(response)
            }
        }
    }

    @Test func unrelatedPreconditionNeverOpensOAuth() async {
        let client = DeletionDouble()
        client.errors = [recentLogin(reason: "unrelated")]
        await #expect(throws: (any Error).self) {
            try await AccountDeletionFlow().run(client: client) { _ in
                Issue.record("Unrelated errors must not open OAuth")
                return client.credential
            }
        }
        #expect(client.events == ["delete"])
        #expect(client.deletionAccount != nil)
    }

    @Test(arguments: [AuthCredential.Provider.apple, .google])
    func staleSessionReauthenticatesSameProviderAndRefreshesBeforeOneRetry(provider: AuthCredential.Provider) async throws {
        let client = DeletionDouble(provider: provider)
        client.errors = [recentLogin(), nil]
        var requested: [AuthCredential.Provider] = []
        try await AccountDeletionFlow().run(client: client) {
            requested.append($0)
            return client.credential
        }
        #expect(requested == [provider])
        #expect(client.events == ["delete", "reauth", "refresh", "delete", "finish"])
        #expect(client.deletionAccount == nil)
    }

    @Test func recentSessionDoesNotOpenOAuth() async throws {
        let client = DeletionDouble()
        try await AccountDeletionFlow().run(client: client) { _ in
            Issue.record("OAuth must not open for a recent session")
            throw AccountDeletionError.cancelled
        }
        #expect(client.events == ["delete", "finish"])
    }

    @Test(arguments: [AuthCredential.Provider.apple, .google])
    func cancellationOrProviderFailureKeepsAccountAndAllowsNewAttempt(provider: AuthCredential.Provider) async throws {
        for error in [AccountDeletionError.cancelled as Error, URLError(.notConnectedToInternet)] {
            let client = DeletionDouble(provider: provider)
            client.errors = [recentLogin(), nil]
            let flow = AccountDeletionFlow()
            await #expect(throws: (any Error).self) {
                try await flow.run(client: client) { _ in throw error }
            }
            #expect(client.events == ["delete"])
            #expect(client.deletionAccount != nil)
            #expect(!flow.isRunning)
            try await flow.run(client: client) { _ in client.credential }
            #expect(client.events == ["delete", "delete", "finish"])
        }
    }

    @Test(arguments: [AuthCredential.Provider.apple, .google])
    func wrongProviderOrProviderAccountNeverReauthenticatesOrRetries(provider: AuthCredential.Provider) async {
        for wrongProvider in [false, true] {
            let client = DeletionDouble(provider: provider)
            client.errors = [recentLogin()]
            var credential = client.credential
            if wrongProvider {
                credential.provider = provider == .apple ? .google : .apple
            } else {
                credential.userIdentifier = "different-provider-user"
            }
            await #expect(throws: AccountDeletionError.wrongAccount) {
                try await AccountDeletionFlow().run(client: client) { _ in credential }
            }
            #expect(client.events == ["delete"])
            #expect(client.deletionAccount != nil)
        }
    }

    @Test func firebaseAccountChangeWhileOAuthOpenPreventsRetry() async {
        let client = DeletionDouble()
        client.errors = [recentLogin()]
        await #expect(throws: AccountDeletionError.wrongAccount) {
            try await AccountDeletionFlow().run(client: client) { _ in
                client.deletionAccount = DeletionAccount(uid: "different-firebase-uid", provider: .apple, providerUserID: "provider-user")
                return client.credential
            }
        }
        #expect(client.events == ["delete"])
    }

    @Test func failuresAtEveryStageNeverFinishOrLoop() async {
        for stage in ["initial", "reauth", "refresh", "retry", "retry-recent-login"] {
            let client = DeletionDouble()
            let serverError = URLError(.cannotConnectToHost)
            client.errors = stage == "initial"
                ? [serverError]
                : [recentLogin(), stage == "retry-recent-login" ? recentLogin() : serverError]
            client.reauthError = stage == "reauth" ? serverError : nil
            client.refreshError = stage == "refresh" ? serverError : nil
            var oauthCalls = 0
            await #expect(throws: (any Error).self) {
                try await AccountDeletionFlow().run(client: client) { _ in
                    oauthCalls += 1
                    return client.credential
                }
            }
            #expect(client.deletionAccount != nil)
            #expect(!client.events.contains("finish"))
            #expect(oauthCalls == (stage == "initial" ? 0 : 1))
            #expect(client.events.filter { $0 == "delete" }.count == (stage.hasPrefix("retry") ? 2 : 1))
        }
    }

    @Test func accountChangeDuringReauthOrRefreshPreventsRemoteRetry() async {
        for stage in ["reauth", "refresh"] {
            let client = DeletionDouble()
            client.errors = [recentLogin()]
            client.changeAccountAt = stage
            await #expect(throws: AccountDeletionError.wrongAccount) {
                try await AccountDeletionFlow().run(client: client) { _ in client.credential }
            }
            #expect(client.events.filter { $0 == "delete" }.count == 1)
            #expect(!client.events.contains("finish"))
        }
    }

    @Test func unsupportedProviderAndSignedOutFailClosed() async {
        let client = DeletionDouble()
        client.deletionAccount = nil
        let flow = AccountDeletionFlow()
        await #expect(throws: AccountDeletionError.signedOut) {
            try await flow.run(client: client) { _ in client.credential }
        }
        #expect(client.events.isEmpty)
        client.deletionAccount = DeletionAccount(uid: "user", provider: nil, providerUserID: nil)
        client.errors = [recentLogin()]
        await #expect(throws: AccountDeletionError.unsupportedProvider) {
            try await flow.run(client: client) { _ in
                Issue.record("Unsupported providers must not open OAuth")
                return client.credential
            }
        }
        #expect(client.events == ["delete"])
    }

    @Test func concurrentDeletionIsRejectedWhileOAuthIsSuspended() async throws {
        let client = DeletionDouble()
        client.errors = [recentLogin(), nil]
        let flow = AccountDeletionFlow()
        var resumeOAuth: CheckedContinuation<AuthCredential, Never>?
        let first = Task { @MainActor in
            try await flow.run(client: client) { _ in
                await withCheckedContinuation { resumeOAuth = $0 }
            }
        }
        while resumeOAuth == nil { await Task.yield() }
        await #expect(throws: AccountDeletionError.alreadyRunning) {
            try await flow.run(client: client) { _ in
                Issue.record("Second OAuth request must not start")
                return client.credential
            }
        }
        #expect(client.events == ["delete"])
        resumeOAuth?.resume(returning: client.credential)
        try await first.value
        #expect(client.events == ["delete", "reauth", "refresh", "delete", "finish"])
        #expect(!flow.isRunning)
    }
}

@MainActor
private final class DeletionDouble: AccountDeletionClient {
    var deletionAccount: DeletionAccount?
    var errors: [Error?] = []
    var reauthError: Error?
    var refreshError: Error?
    var changeAccountAt: String?
    var events: [String] = []
    let credential: AuthCredential

    init(provider: AuthCredential.Provider = .apple) {
        deletionAccount = DeletionAccount(uid: "firebase-user", provider: provider, providerUserID: "provider-user")
        credential = AuthCredential(provider: provider, userIdentifier: "provider-user", identityToken: "test-token",
                                    rawNonce: "test-nonce", accessToken: "test-access")
    }

    func deleteRemoteAccount() async throws {
        events.append("delete")
        if !errors.isEmpty, let error = errors.removeFirst() { throw error }
    }

    func reauthenticate(with credential: AuthCredential, account: DeletionAccount) async throws {
        events.append("reauth")
        #expect(deletionAccount == account)
        #expect(credential.userIdentifier == account.providerUserID)
        if changeAccountAt == "reauth" { deletionAccount = nil }
        if let reauthError { throw reauthError }
    }

    func refreshToken(for account: DeletionAccount) async throws {
        events.append("refresh")
        #expect(deletionAccount == account)
        if changeAccountAt == "refresh" { deletionAccount = nil }
        if let refreshError { throw refreshError }
    }

    func finishDeletion(for account: DeletionAccount) throws {
        events.append("finish")
        #expect(deletionAccount == account)
        deletionAccount = nil
    }
}
