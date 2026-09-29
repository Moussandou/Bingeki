import SwiftUI

enum RootTab: Hashable { case home, discover, library }

/// Branches on auth state (§5.1 of the handoff doc) before showing the
/// signed-in shell.
struct RootView: View {
    @Environment(InMemoryAuthStore.self) private var auth

    var body: some View {
        if auth.isSignedIn {
            SignedInRootView()
        } else {
            AuthView()
        }
    }
}

/// 3 tabs + a floating search button, thumb-reachable at the bottom right —
/// direction B from board `02 · MVP & navigation`. Search sits outside the
/// `TabView` on purpose: it's an action, not a destination.
private struct SignedInRootView: View {
    @Environment(InMemoryUserStore.self) private var userStore
    @State private var selectedTab: RootTab = .home
    @State private var showSearch = false

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
        .sheet(isPresented: $showSearch) { SearchView() }
        .overlay { BKToastOverlay() }
        .overlay {
            if let level = userStore.recentLevelUp {
                BKLevelUpOverlay(level: level) { userStore.clearLevelUp() }
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: userStore.recentLevelUp)
    }
}

#Preview {
    RootView()
        .environment(InMemoryLibraryStore.preview)
        .environment(InMemoryUserStore.preview)
        .environment(ToastCenter())
        .environment(DiscoverDeck(pool: Work.sampleLibrary))
}
