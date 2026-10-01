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
    @AppStorage("bk.onboardingDone") private var onboardingDone = false

    /// Shown once, only to accounts whose library is empty (not to web users).
    private var onboardingBinding: Binding<Bool> {
        Binding(
            get: {
                #if DEBUG
                // `-bk.forceOnboarding YES` to preview it on any account.
                if UserDefaults.standard.bool(forKey: "bk.forceOnboarding") && !onboardingDone { return true }
                #endif
                return library.hasLoaded && library.works.isEmpty && !onboardingDone
            },
            set: { if !$0 { onboardingDone = true } }
        )
    }

    private func finishOnboarding(_ loved: [Work]) {
        for work in loved {
            var added = work
            added.status = .completed
            added.currentEpisode = added.totalEpisodes ?? 0
            added.currentChapter = added.totalChapters ?? 0
            added.dateAdded = .now
            added.lastUpdated = .now
            library.upsert(added)
            userStore.addXP(GamificationCore.XPReward.addWork)
        }
        onboardingDone = true
        HapticEngine.success()
        Task { await deck.load(library: library.works, sfw: !userStore.profile.nsfwMode) }
    }

    init(uid: String) {
        self.uid = uid
        _library = State(initialValue: FirebaseLibraryStore(uid: uid))
        _userStore = State(initialValue: FirebaseUserStore(uid: uid))
        #if DEBUG
        // `-bk.initialTab discover` at launch, for simulator screenshots.
        if let raw = UserDefaults.standard.string(forKey: "bk.initialTab"), let tab = RootTab(rawValue: raw) {
            _selectedTab = State(initialValue: tab)
        }
        // `-bk.searchQuery chainsow` opens search pre-filled.
        if UserDefaults.standard.string(forKey: "bk.searchQuery") != nil {
            _showSearch = State(initialValue: true)
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
        // Presented content sits outside the `.environment` above: inject explicitly.
        .sheet(isPresented: $showSearch) {
            SearchView()
                .environment(\.libraryStore, library)
                .environment(\.userStore, userStore)
        }
        .fullScreenCover(isPresented: onboardingBinding) {
            OnboardingView(onFinish: finishOnboarding, onSkip: { onboardingDone = true })
                .environment(\.userStore, userStore)
        }
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
