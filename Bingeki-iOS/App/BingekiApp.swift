import FirebaseCore
import FirebaseFirestore
import GoogleSignIn
import SwiftUI

@main
struct BingekiApp: App {
    // `authStore` is the one store that exists before anyone is signed in.
    // `libraryStore`/`userStore` need a uid, so `SignedInRootView`
    // constructs the real Firebase-backed ones itself once `auth.uid` is
    // known — see EnvironmentKeys.swift's doc comment for why this couldn't
    // just be `@Environment(SomeConcreteType.self)` everywhere.
    @State private var auth: any AuthProviding
    @State private var toasts = ToastCenter()

    init() {
        // Covers load through AsyncImage → URLSession.shared → URLCache.shared;
        // the default is a few MB in memory only, so every launch re-downloaded
        // every cover. 300 MB on disk keeps them across launches.
        URLCache.shared = URLCache(memoryCapacity: 50 * 1024 * 1024, diskCapacity: 300 * 1024 * 1024)
        Task.detached(priority: .background) { await ResponseCache.shared?.prune() }
        #if DEBUG
        if UserDefaults.standard.bool(forKey: "bk.forceSignedOut") {
            _auth = State(initialValue: InMemoryAuthStore(isSignedIn: false))
            return
        }
        if UserDefaults.standard.bool(forKey: "bk.mockAuth") {
            _auth = State(initialValue: InMemoryAuthStore(isSignedIn: true))
            return
        }
        #endif
        FirebaseApp.configure()
        #if DEBUG
        // `-bk.forceOffline YES`: Firestore serves its disk cache and queues writes.
        if UserDefaults.standard.bool(forKey: "bk.forceOffline") {
            Firestore.firestore().disableNetwork { _ in }
        }
        #endif
        _auth = State(initialValue: FirebaseAuthStore())
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.authStore, auth)
                .environment(toasts)
                // Google Sign-In returns through the REVERSED_CLIENT_ID scheme.
                .onOpenURL { GIDSignIn.sharedInstance.handle($0) }
        }
    }
}
