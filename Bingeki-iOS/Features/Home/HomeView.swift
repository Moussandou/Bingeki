import SwiftUI

/// Accueil — "Reprendre" first, then "À voir ensuite", then a teaser into
/// Discover. Mirrors board `S01-Home` on the mockup canvas.
struct HomeView: View {
    @Environment(InMemoryLibraryStore.self) private var library
    @Environment(InMemoryUserStore.self) private var userStore
    @Binding var selectedTab: RootTab

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
                                    }
                                }
                            }
                            .padding(.horizontal, BKSpace.screenMargin)
                        }
                    }
                }

                section(title: "À voir ensuite", trailingAction: ("Tout voir", { selectedTab = .library })) {
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
                                        Text(work.title).font(.caption).lineLimit(1)
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
            .padding(.bottom, BKSize.tabBarHeight + BKSpace.xxxl)
        }
        .background(BKColor.background)
        .navigationDestination(for: Work.self) { WorkDetailView(work: $0) }
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
            }
            Spacer()
            NavigationLink(value: ProfileRoute.main) {
                StreakBadge(days: userStore.profile.streak)
            }
            NavigationLink(value: ProfileRoute.main) {
                LevelAvatar(profile: userStore.profile)
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }

    @ViewBuilder
    private var discoverTeaser: some View {
        Button {
            selectedTab = .discover
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    BKCover(url: reading.first?.image ?? planned.first?.image)
                        .frame(width: 96, height: 84)
                        .rotationEffect(.degrees(-6))
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("POUR TOI").font(BKFont.caption).foregroundStyle(BKColor.cyanText)
                    Text("Ta sélection du jour est prête").font(.subheadline.weight(.semibold))
                    Text("SWIPER →").font(BKFont.display(14)).foregroundStyle(BKColor.cyanText)
                }
                Spacer()
            }
            .padding(BKSpace.md)
            .frame(minHeight: 110)
        }
        .buttonStyle(.plain)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow(BKColor.brandCyan)
        .padding(.horizontal, BKSpace.screenMargin)
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

    var body: some View {
        HStack(spacing: BKSpace.md) {
            NavigationLink(value: work) {
                BKCover(url: work.image).frame(width: 100, height: 146)
            }
            VStack(alignment: .leading, spacing: BKSpace.sm) {
                Text(work.title).font(.subheadline.weight(.bold)).lineLimit(2)
                Text(work.type == .anime ? "Ép. \(work.progress)" + (work.total.map { " / \($0)" } ?? "") : "Ch. \(work.progress)")
                    .font(.caption).foregroundStyle(BKColor.textSecondary)
                ProgressView(value: work.progressFraction)
                    .tint(BKColor.brandPink)
                Button {
                    onIncrement(1)
                } label: {
                    Text(work.type == .anime ? "+1 ÉPISODE" : "+1 CHAPITRE")
                        .font(BKFont.display(14))
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .foregroundStyle(.white)
                        .background(BKColor.ctaFill)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(BKSpace.sm)
        .frame(width: 296)
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
            .environment(InMemoryLibraryStore.preview)
            .environment(InMemoryUserStore.preview)
    }
}
