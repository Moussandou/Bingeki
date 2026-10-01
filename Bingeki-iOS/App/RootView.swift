import SwiftUI

enum RootTab: String, Hashable { case home, discover, library }

/// Branches on auth state (§5.1 of the handoff doc) before showing the
/// signed-in shell.
struct RootView: View {
    @Environment(\.authStore) private var auth
    @AppStorage("bk.themePreference") private var themePreference = ThemePreference.system.rawValue

    var body: some View {
        Group {
            if auth.isSignedIn, let uid = auth.uid {
                SignedInRootView(uid: uid)
            } else {
                AuthView()
            }
        }
        .preferredColorScheme((ThemePreference(rawValue: themePreference) ?? .system).colorScheme)
    }
}

/// 3 tabs + a floating search button, thumb-reachable at the bottom right —
/// direction B from board `02 · MVP & navigation`. Search sits outside the
/// `TabView` on purpose: it's an action, not a destination.
///
/// Owns the account-scoped stores: constructed fresh per `uid`, so signing
/// out and back in as a different account (or Firestore simply not having
/// synced yet) never leaks the previous account's data — `RootView` throws
/// this whole subtree away and rebuilds it whenever `uid` changes, since
/// `uid` drives `SignedInRootView`'s own SwiftUI identity here.
private struct SignedInRootView: View {
    let uid: String
    @State private var library: any LibraryStoring
    @State private var userStore: any UserStoring
    @State private var deck = DiscoverDeck()
    @State private var network = NetworkMonitor()
    @State private var selectedTab: RootTab = .home
    @State private var showSearch = false

    init(uid: String) {
        self.uid = uid
        _library = State(initialValue: FirebaseLibraryStore(uid: uid))
        _userStore = State(initialValue: FirebaseUserStore(uid: uid))
        #if DEBUG
        // `-bk.initialTab discover` at launch, for simulator screenshots.
        if let raw = UserDefaults.standard.string(forKey: "bk.initialTab"), let tab = RootTab(rawValue: raw) {
            _selectedTab = State(initialValue: tab)
        }
        #endif
    }

    var body: some View {
        // System tab bar hidden in favour of the mockups' inked `BKTabBar`.
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView(selectedTab: $selectedTab)
                    .bkOfflineBanner()
                    .navigationDestination(for: ProfileRoute.self) { route in
                        switch route {
                        case .main: ProfileView()
                        case .settings: SettingsView()
                        }
                    }
            }
            .bkTabPage()
            .tag(RootTab.home)

            NavigationStack { DiscoverView().bkOfflineBanner() }
                .bkTabPage()
                .tag(RootTab.discover)

            NavigationStack { LibraryListView(selectedTab: $selectedTab) { showSearch = true }.bkOfflineBanner() }
                .bkTabPage()
                .tag(RootTab.library)
        }
        .background(BKColor.background.ignoresSafeArea())
        .overlay(alignment: .bottom) {
            BKTabBar(selection: $selectedTab) { showSearch = true }
        }
        .environment(\.libraryStore, library)
        .environment(\.userStore, userStore)
        .environment(deck)
        .environment(network)
        .sheet(isPresented: $showSearch) { SearchView() }
        .overlay { BKToastOverlay() }
        .overlay {
            if let level = userStore.recentLevelUp {
                BKLevelUpOverlay(level: level) { userStore.clearLevelUp() }
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: userStore.recentLevelUp)
        .id(uid)
    }
}

#Preview {
    RootView()
        .environment(\.authStore, InMemoryAuthStore(isSignedIn: true))
        .environment(ToastCenter())
}
