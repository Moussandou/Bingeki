import SwiftUI

/// Accueil — "Reprendre" first, then "À voir ensuite", then a teaser into
/// Discover. Mirrors board `S01-Home` on the mockup canvas.
struct HomeView: View {
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(DiscoverDeck.self) private var deck
    @Binding var selectedTab: RootTab
    /// Opens Découvrir on "Parcourir" (deck exhausted).
    var onBrowse: () -> Void = {}
    @State private var ratingWork: Work?
    @State private var showStreak = false

    private var reading: [Work] { library.works(status: .reading) }
    private var planned: [Work] { library.works(status: .planToRead) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BKSpace.sectionGap) {
                header

                section(title: "Reprendre", trailingCount: "\(reading.count) en cours") {
                    if reading.isEmpty {
                        emptyRowHint("Rien en cours. Ajoute un titre depuis Découvrir.")
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: BKSpace.cardGap) {
                                ForEach(reading) { work in
                                    ContinueCard(work: work) { delta in
                                        var updated = work
                                        updated.incrementProgress(by: delta)
                                        library.upsert(updated)
                                        userStore.addXP(GamificationCore.XPReward.updateProgress * delta)
                                        HapticEngine.progressTick()
                                        if updated.status == .completed {
                                            userStore.addXP(GamificationCore.XPReward.completeWork)
                                            HapticEngine.success()
                                            ratingWork = updated
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, BKSpace.screenMargin)
                        }
                    }
                }

                section(title: "À voir ensuite", trailingAction: ("Tout voir ›", { selectedTab = .library })) {
                    if planned.isEmpty {
                        emptyRowHint("Vide. Glisse → dans Découvrir pour la remplir.")
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: BKSpace.cardGap) {
                                ForEach(planned) { work in
                                    VStack(spacing: BKSpace.sm) {
                                        NavigationLink(value: work) {
                                            BKCover(url: work.image).frame(width: 104, height: 150)
                                        }
                                        Text(caption(for: work))
                                            .font(.caption)
                                            .foregroundStyle(BKColor.textSecondary)
                                            .lineLimit(1)
                                    }
                                    .frame(width: 104)
                                }
                            }
                            .padding(.horizontal, BKSpace.screenMargin)
                        }
                    }
                }

                discoverTeaser
            }
            .padding(.top, BKSpace.lg)
            .padding(.bottom, BKSpace.xl)
        }
        .background(alignment: .top) { HalftoneDots().frame(height: 230).ignoresSafeArea(edges: .top) }
        .background(BKColor.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Work.self) { WorkDetailView(work: $0) }
        .sheet(item: $ratingWork) { work in
            RatingSheetView(work: work, xpGained: GamificationCore.XPReward.completeWork)
                .presentationDetents([.height(340)])
        }
        .sheet(isPresented: $showStreak) {
            StreakSheet(days: userStore.profile.streak)
                .presentationDetents([.height(470)])
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Salut \(userStore.profile.displayName ?? "Chasseur")")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BKColor.textSecondary)
                Text("On reprend ?")
                    .font(BKFont.largeTitle)
                    .bkLabelStyle()
                    .accessibilityIdentifier("home_title")
            }
            Spacer()
            Button { showStreak = true } label: {
                StreakBadge(days: userStore.profile.streak)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Affiche le détail de ta série")
            .accessibilityIdentifier("home_streak_badge")
            NavigationLink(value: ProfileRoute.main) {
                LevelAvatar(profile: userStore.profile)
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }

    private func caption(for work: Work) -> String {
        let type = work.type == .anime ? (work.format == "Movie" ? "Film" : "Anime") : "Manga"
        guard let total = work.total else { return type }
        return "\(type) · \(total) \(work.type == .anime ? "ép." : "ch.")"
    }

    /// Teaser into the deck, or into "Parcourir" once every card is seen.
    @ViewBuilder
    private var discoverTeaser: some View {
        if deck.phase == .loaded && deck.currentCard == nil {
            exhaustedTeaser
        } else {
            deckTeaser
        }
    }

    private var exhaustedTeaser: some View {
        Button(action: onBrowse) {
            VStack(alignment: .leading, spacing: 6) {
                Text("POUR TOI · TOUT VU")
                    .font(BKFont.display(11, weight: .heavy)).tracking(0.9)
                    .foregroundStyle(BKColor.cyanText)
                Text("Plus de cartes pour aujourd'hui. Fouille le catalogue : saisons, genres, top.")
                    .font(.body.weight(.bold))
                    .multilineTextAlignment(.leading)
                Text("PARCOURIR LE CATALOGUE →").font(BKFont.display(14)).foregroundStyle(BKColor.cyanText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
        }
        .buttonStyle(.plain)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow(BKColor.brandCyan)
        .padding(.horizontal, BKSpace.screenMargin)
        .accessibilityIdentifier("home_browse_teaser")
    }

    /// Real upcoming covers, count and reason.
    private var deckTeaser: some View {
        let upcoming = Array(deck.pool.dropFirst(deck.index).prefix(3))
        let reason = upcoming.first.flatMap { deck.reasons[$0.id] }
        let remaining = max(0, deck.pool.count - deck.index)
        return Button {
            selectedTab = .discover
        } label: {
            HStack(spacing: 14) {
                ZStack(alignment: .leading) {
                    ForEach(Array(upcoming.enumerated()), id: \.element.id) { i, work in
                        BKCover(url: work.imageSmall ?? work.image)
                            .frame(width: 64, height: 92)
                            .rotationEffect(.degrees([-8, 2, 10][i]))
                            .offset(x: CGFloat(i) * 28, y: [10, 4, 14][i] - 8)
                    }
                    if upcoming.isEmpty {
                        Rectangle().fill(BKColor.surfaceTint).frame(width: 64, height: 92)
                    }
                }
                .frame(width: 120, height: 118, alignment: .leading)
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 6) {
                    Text(remaining > 0 ? "POUR TOI · \(remaining) TITRES" : "POUR TOI")
                        .font(BKFont.display(11, weight: .heavy)).tracking(0.9)
                        .foregroundStyle(BKColor.cyanText)
                    Text(teaserLine(reason))
                        .font(.body.weight(.bold))
                        .multilineTextAlignment(.leading)
                    Text("SWIPER LA SÉLECTION →").font(BKFont.display(14)).foregroundStyle(BKColor.cyanText)
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .frame(minHeight: 150)
        }
        .buttonStyle(.plain)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow(BKColor.brandCyan)
        .padding(.horizontal, BKSpace.screenMargin)
        .task(id: library.hasLoaded) {
            guard library.hasLoaded else { return }
            await deck.loadIfNeeded(library: library.works, sfw: !userStore.profile.nsfwMode)
        }
    }

    /// "PARCE QUE TU AS AIMÉ FRIEREN" → "Parce que tu as aimé Frieren".
    private func teaserLine(_ reason: String?) -> String {
        guard let reason, reason.hasPrefix("PARCE"), let title = reason.components(separatedBy: "AIMÉ ").last else {
            return "Ta sélection du jour est prête"
        }
        return "Parce que tu as aimé \(title.capitalized)"
    }

    @ViewBuilder
    private func section<Content: View>(
        title: String,
        trailingCount: String? = nil,
        trailingAction: (String, () -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: BKSpace.md) {
            HStack {
                Text(title).font(BKFont.title3).bkLabelStyle()
                Spacer()
                if let trailingCount {
                    Text(trailingCount).font(.caption).foregroundStyle(BKColor.textSecondary)
                }
                if let (label, action) = trailingAction {
                    Button(label, action: action)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(BKColor.accentText)
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
            content()
        }
    }

    private func emptyRowHint(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(BKColor.textSecondary)
            .padding(.horizontal, BKSpace.screenMargin)
    }
}

private struct ContinueCard: View {
    let work: Work
    let onIncrement: (Int) -> Void

    private var meta: String {
        let unit = work.type == .anime ? "Ép." : "Ch."
        let count = "\(unit) \(work.progress)" + (work.total.map { " / \($0)" } ?? "")
        return count + " · " + (work.type == .anime ? "Anime" : "Manga")
    }

    var body: some View {
        HStack(spacing: BKSpace.md) {
            NavigationLink(value: work) {
                BKCover(url: work.image).frame(width: 100, height: 146)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(work.title).font(.body.weight(.bold)).lineLimit(2)
                Text(meta).font(.caption).foregroundStyle(BKColor.textSecondary)
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(BKColor.surfaceTint)
                        Rectangle().fill(BKColor.brandPink).frame(width: proxy.size.width * work.progressFraction)
                    }
                }
                .frame(height: 6)
                Spacer(minLength: 0)
                Button {
                    onIncrement(1)
                } label: {
                    Text(work.type == .anime ? "+1 ÉPISODE" : "+1 CHAPITRE")
                        .font(BKFont.display(16))
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .foregroundStyle(.white)
                        .background(BKColor.ctaFill)
                        .clipShape(BKChamferedShape(cut: 10))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Plus un pour \(work.title)")
            }
            .frame(height: 146)
        }
        .padding(10)
        .frame(width: 300)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow()
    }
}

private struct StreakBadge: View {
    let days: Int

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: "flame.fill")
            Text("\(days)")
        }
        .font(BKFont.display(15))
        .foregroundStyle(BKColor.orangeText)
        .padding(.horizontal, 10)
        .frame(height: 36)
        .background(BKColor.surface)
        .bkInkBorder()
        .accessibilityLabel("Série de \(days) jours")
    }
}

/// Tap on the flame: where the streak stands and what tomorrow is worth.
private struct StreakSheet: View {
    let days: Int
    @Environment(\.dismiss) private var dismiss

    private var todayXP: Int { GamificationCore.XPReward.dailyLogin + GamificationCore.streakBonusXP(days) }
    private var tomorrowXP: Int { GamificationCore.XPReward.dailyLogin + GamificationCore.streakBonusXP(days + 1) }
    /// First streak length at which the bonus stops growing.
    private var maxedAt: Int { GamificationCore.maxStreakBonus / GamificationCore.streakBonusPerDay + 1 }

    var body: some View {
        VStack(alignment: .leading, spacing: BKSpace.lg) {
            HStack(spacing: BKSpace.md) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 44, weight: .black))
                    .foregroundStyle(BKColor.orangeText)
                VStack(alignment: .leading, spacing: 2) {
                    Text(days > 1 ? "\(days) jours" : days == 1 ? "1 jour" : "Pas de série")
                        .font(BKFont.title1).bkLabelStyle()
                    Text("Série en cours").font(.caption).foregroundStyle(BKColor.textSecondary)
                }
            }

            VStack(spacing: 0) {
                row("Aujourd'hui", "+\(todayXP) XP")
                row("Demain si tu reviens", "+\(tomorrowXP) XP")
                row("Bonus maximum", days >= maxedAt ? "Atteint" : "à \(maxedAt) jours")
            }
            .background(BKColor.surface)
            .bkInkBorder(BKColor.border)

            Text("Ouvre Bingeki une fois par jour pour garder ta série. Un jour manqué la remet à 1. Le bonus grimpe de \(GamificationCore.streakBonusPerDay) XP par jour, jusqu'à \(GamificationCore.maxStreakBonus) XP.")
                .font(.footnote)
                .foregroundStyle(BKColor.textSecondary)

            Spacer(minLength: 0)
            BKPrimaryButton(title: "Compris", systemImage: "checkmark") { dismiss() }
        }
        .padding(BKSpace.screenMargin)
        .padding(.top, BKSpace.md)
        .background(BKColor.background.ignoresSafeArea())
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline)
            Spacer()
            Text(value).font(BKFont.display(15)).foregroundStyle(BKColor.orangeText)
        }
        .padding(.horizontal, BKSpace.md)
        .frame(minHeight: 48)
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
    }
}

private struct LevelAvatar: View {
    let profile: UserProfile

    var body: some View {
        ZStack {
            Circle().stroke(BKColor.surfaceTint, lineWidth: 4)
            Circle()
                .trim(from: 0, to: min(1, Double(profile.xp) / Double(max(profile.xpToNextLevel, 1))))
                .stroke(BKColor.brandPink, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Circle()
                .fill(LinearGradient(colors: [BKColor.brandCyan, .indigo], startPoint: .topLeading, endPoint: .bottomTrailing))
                .padding(5)
            Text("\(profile.level)")
                .font(BKFont.display(14))
                .foregroundStyle(.white)
        }
        .frame(width: 48, height: 48)
        .accessibilityLabel("Profil, niveau \(profile.level)")
    }
}

#Preview {
    NavigationStack {
        HomeView(selectedTab: .constant(.home))
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
            .environment(\.userStore, InMemoryUserStore.preview)
            .environment(DiscoverDeck(pool: Work.sampleLibrary))
    }
}

