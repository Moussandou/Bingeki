import FirebaseCore
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
        FirebaseApp.configure()
        _auth = State(initialValue: FirebaseAuthStore())
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.authStore, auth)
                .environment(toasts)
        }
    }
}
