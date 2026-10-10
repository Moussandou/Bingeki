import SwiftUI

enum RootTab: String, Hashable { case home, discover, library, profile }

/// Branches on auth state (§5.1 of the handoff doc) before showing the
/// signed-in shell.
struct RootView: View {
    @Environment(\.authStore) private var auth
    @AppStorage("bk.themePreference") private var themePreference = ThemePreference.system.rawValue
    @State private var showSplash = true
    @State private var contentReady = false

    var body: some View {
        Group {
            if auth.isSignedIn, let uid = auth.uid {
                SignedInRootView(uid: uid) { contentReady = true }
            } else {
                AuthView().onAppear { contentReady = true }
            }
        }
        .overlay {
            if showSplash {
                BKSplashView(isReady: contentReady) {
                    withAnimation(.easeIn(duration: 0.3)) { showSplash = false }
                }
                .transition(.asymmetric(insertion: .identity, removal: .opacity.combined(with: .scale(scale: 1.15))))
            }
        }
        .preferredColorScheme((ThemePreference(rawValue: themePreference) ?? .system).colorScheme)
        .environment(\.bkAmoled, themePreference == ThemePreference.amoled.rawValue)
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
    /// Library known (cloud or disk cache): the splash can go.
    var onReady: () -> Void = {}
    @State private var library: any LibraryStoring
    @State private var userStore: any UserStoring
    @State private var deck = DiscoverDeck()
    @State private var network = NetworkMonitor()
    @State private var selectedTab: RootTab = .home
    /// Where the profile's back button returns to.
    @State private var tabBeforeProfile: RootTab = .home
    @State private var discoverSegment: DiscoverView.Segment = .forYou
    @State private var homePath = NavigationPath()
    @State private var profilePath = NavigationPath()
    @State private var showSearch = false
    @AppStorage("bk.onboardingDone") private var onboardingDone = false
    @Environment(\.scenePhase) private var scenePhase
    @Environment(ToastCenter.self) private var toasts

    /// Shown once, only to accounts whose library is empty (not to web users).
    private var onboardingBinding: Binding<Bool> {
        Binding(
            get: {
                #if DEBUG
                if UserDefaults.standard.bool(forKey: "bk.skipOnboarding") { return false }
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

    init(uid: String, onReady: @escaping () -> Void = {}) {
        self.uid = uid
        self.onReady = onReady
        #if DEBUG
        if UserDefaults.standard.bool(forKey: "bk.demoLibrary") {
            // `-bk.demoLibrary YES`: rich fake account for trailers / screenshots.
            _library = State(initialValue: InMemoryLibraryStore(seed: Work.demoLibrary))
            _userStore = State(initialValue: InMemoryUserStore(profile: .demo))
        } else if UserDefaults.standard.bool(forKey: "bk.useInMemoryStore") {
            _library = State(initialValue: InMemoryLibraryStore.preview)
            _userStore = State(initialValue: InMemoryUserStore.preview)
        } else {
            _library = State(initialValue: FirebaseLibraryStore(uid: uid))
            _userStore = State(initialValue: FirebaseUserStore(uid: uid))
        }
        #else
        _library = State(initialValue: FirebaseLibraryStore(uid: uid))
        _userStore = State(initialValue: FirebaseUserStore(uid: uid))
        #endif
        #if DEBUG
        // `-bk.initialTab discover` at launch, for simulator screenshots.
        if let raw = UserDefaults.standard.string(forKey: "bk.initialTab"), let tab = RootTab(rawValue: raw) {
            _selectedTab = State(initialValue: tab)
        }
        // `-bk.discoverSegment browse` for simulator screenshots.
        if UserDefaults.standard.string(forKey: "bk.discoverSegment") == "browse" {
            _discoverSegment = State(initialValue: .browse)
        }
        // `-bk.searchQuery chainsow` opens search pre-filled.
        if UserDefaults.standard.string(forKey: "bk.searchQuery") != nil {
            _showSearch = State(initialValue: true)
        }
        // `-bk.openWork 52991:anime` pushes that work's detail on Home.
        if let raw = UserDefaults.standard.string(forKey: "bk.openWork") {
            let parts = raw.split(separator: ":").map(String.init)
            var path = NavigationPath()
            path.append(Work(id: parts[0], title: "", type: parts.last == "manga" ? .manga : .anime, status: .planToRead))
            _homePath = State(initialValue: path)
        }
        // `-bk.openProfile YES` opens the profile tab.
        if UserDefaults.standard.bool(forKey: "bk.openProfile") {
            _selectedTab = State(initialValue: .profile)
        }
        #endif
    }

    var body: some View {
        // System tab bar hidden in favour of the mockups' inked `BKTabBar`.
        TabView(selection: $selectedTab) {
            NavigationStack(path: $homePath) {
                HomeView(selectedTab: $selectedTab, onSearch: { showSearch = true }) {
                    discoverSegment = .browse
                    selectedTab = .discover
                }
                .bkOfflineBanner()
            }
            .bkTabPage()
            .tag(RootTab.home)

            NavigationStack { DiscoverView(segment: $discoverSegment) { showSearch = true }.bkOfflineBanner() }
                .bkTabPage()
                .tag(RootTab.discover)

            NavigationStack { LibraryListView(selectedTab: $selectedTab) { showSearch = true }.bkOfflineBanner() }
                .bkTabPage()
                .tag(RootTab.library)

            NavigationStack(path: $profilePath) {
                ProfileView(onBack: { selectedTab = tabBeforeProfile })
                    .bkOfflineBanner()
                    .navigationDestination(for: ProfileRoute.self) { route in
                        switch route {
                        case .main: ProfileView()
                        case .settings: SettingsView()
                        }
                    }
            }
            .bkTabPage()
            .tag(RootTab.profile)
        }
        .background(BKColor.background.ignoresSafeArea())
        .overlay(alignment: .bottom) {
            BKTabBar(selection: $selectedTab)
        }
        .onChange(of: selectedTab) { old, new in if new == .profile, old != .profile { tabBeforeProfile = old } }
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
        .onChange(of: library.hasLoaded, initial: true) { _, loaded in if loaded { onReady() } }
        // Daily streak: counted once per calendar day on open/return, like
        // `recordActivity` in the web's auth sync.
        .onChange(of: scenePhase, initial: true) { _, phase in
            guard phase == .active, library is FirebaseLibraryStore else { return }
            Task {
                if let streak = await FirebaseGamificationStore.recordDailyActivity(uid: uid), streak > 1 {
                    toasts.show("Série de \(streak) jours · +\(GamificationCore.XPReward.dailyLogin + GamificationCore.streakBonusXP(streak)) XP")
                }
            }
        }
        .id(uid)
    }
}

#Preview {
    RootView()
        .environment(\.authStore, InMemoryAuthStore(isSignedIn: true))
        .environment(ToastCenter())
}
