import SwiftUI

/// Protocol-typed `EnvironmentValues` entries — this is what actually makes
/// `FirebaseLibraryStore`/`FirebaseUserStore`/`FirebaseAuthStore` drop-in
/// replacements for the `InMemory*` ones (§8 of the handoff doc). Every
/// screen reads `@Environment(\.libraryStore)` etc., never a concrete type,
/// so `SignedInRootView` is the only place that decides which
/// implementation is actually live.
///
/// (`@Environment(SomeConcreteClass.self)` — which every screen used until
/// this file existed — can't do this: it requires the exact concrete
/// `@Observable` type, which would have hard-locked the whole app to
/// `InMemory*` regardless of what Firebase code got written elsewhere.)
extension EnvironmentValues {
    @Entry var libraryStore: any LibraryStoring = UnconfiguredLibraryStore()
    @Entry var userStore: any UserStoring = UnconfiguredUserStore()
    @Entry var authStore: any AuthProviding = UnconfiguredAuthStore()
}

// MARK: - `@Entry` defaults

// `@Entry`'s generated default-value expression runs in a nonisolated
// context, but the real `InMemory*`/`Firebase*` stores are `@MainActor
// @Observable` — `@Observable` rewrites stored properties into
// actor-isolated tracked accessors, so even a `nonisolated init` can't
// assign them from a nonisolated context. These three plain, non-actor,
// non-Observable placeholders exist only to satisfy that constraint; every
// real screen sits under `SignedInRootView`/`AuthView`, which always
// override these via `.environment(\.xStore, …)` before rendering, so a
// placeholder is never actually shown.
private final class UnconfiguredLibraryStore: LibraryStoring {
    var works: [Work] = []
    var hasLoaded: Bool { false }
    func upsert(_ work: Work) {}
    func remove(id: String) {}
    func work(id: String) -> Work? { nil }
}

private final class UnconfiguredUserStore: UserStoring {
    var profile = UserProfile(uid: "")
    var recentLevelUp: Int? { nil }
    func addXP(_ amount: Int) {}
    func update(_ mutate: (inout UserProfile) -> Void) {}
    func clearLevelUp() {}
}

private final class UnconfiguredAuthStore: AuthProviding {
    var isSignedIn: Bool { false }
    var uid: String? { nil }
    var accountLabel: String { "" }
    func signIn(with credential: AuthCredential) async throws {}
    func signOut() throws {}
    func deleteAccount() async throws {}
}
