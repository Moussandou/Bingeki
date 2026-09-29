import SwiftUI

enum RootTab: Hashable { case home, discover, library }

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
    @State private var selectedTab: RootTab = .home
    @State private var showSearch = false

    init(uid: String) {
        self.uid = uid
        _library = State(initialValue: FirebaseLibraryStore(uid: uid))
        _userStore = State(initialValue: FirebaseUserStore(uid: uid))
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // `.tabItem` (not the iOS 18 `Tab` struct) to keep iOS 17 as the
            // deployment target — see §4 of the handoff doc.
            TabView(selection: $selectedTab) {
                NavigationStack {
                    HomeView(selectedTab: $selectedTab)
                        .navigationDestination(for: ProfileRoute.self) { route in
                            switch route {
                            case .main: ProfileView()
                            case .settings: SettingsView()
                            }
                        }
                }
                .tabItem { Label("Accueil", systemImage: "house.fill") }
                .tag(RootTab.home)

                NavigationStack { DiscoverView() }
                    .tabItem { Label("Découvrir", systemImage: "scope") }
                    .tag(RootTab.discover)

                NavigationStack { LibraryListView() }
                    .tabItem { Label("Biblio", systemImage: "books.vertical.fill") }
                    .tag(RootTab.library)
            }

            Button {
                showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.title3.weight(.semibold))
                    .frame(width: BKSize.tabBarHeight, height: BKSize.tabBarHeight)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder()
                    .bkPanelShadow()
            }
            .padding(.trailing, BKSpace.md)
            .padding(.bottom, 90) // clears the system tab bar
            .accessibilityLabel("Rechercher")
        }
        .environment(\.libraryStore, library)
        .environment(\.userStore, userStore)
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
        .environment(DiscoverDeck(pool: Work.sampleLibrary))
}
