import SwiftUI

@main
struct BingekiApp: App {
    // Phase 0 stores are in-memory; Phase 1 swaps these for Firebase-backed
    // implementations behind the same `LibraryStoring`/`UserStoring`
    // protocols — no call site elsewhere needs to change.
    @State private var auth = InMemoryAuthStore()
    @State private var library = InMemoryLibraryStore(seed: Work.sampleLibrary)
    @State private var userStore = InMemoryUserStore(profile: .sample)
    @State private var toasts = ToastCenter()
    @State private var deck = DiscoverDeck(pool: Work.sampleLibrary)

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(library)
                .environment(userStore)
                .environment(toasts)
                .environment(deck)
        }
    }
}
