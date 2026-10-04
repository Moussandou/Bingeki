import SwiftUI

/// Découvrir — "Pour toi" (swipe deck) / "Parcourir" (grid), boards `S02`–`S04`.
struct DiscoverView: View {
    /// Owned by `RootView` so Home can open "Parcourir" directly.
    @Binding var segment: Segment
    var onSearch: () -> Void = {}

    enum Segment: String, CaseIterable { case forYou = "POUR TOI", browse = "PARCOURIR" }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(Segment.allCases, id: \.self) { item in
                    Button {
                        segment = item
                    } label: {
                        Text(item.rawValue)
                            .font(BKFont.display(14, weight: .heavy))
                            .tracking(0.7)
                            .padding(.horizontal, 14)
                            .frame(height: 44)
                            .foregroundStyle(segment == item ? BKColor.textPrimary : BKColor.textSecondary)
                            .overlay(alignment: .bottom) {
                                if segment == item { Rectangle().fill(BKColor.brandPink).frame(height: 3) }
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("discover_segment_\(item == .forYou ? "for_you" : "browse")")
                    .accessibilityAddTraits(segment == item ? .isSelected : [])
                }
                Spacer()
            }
            .padding(.horizontal, BKSpace.sm)

            if segment == .forYou {
                DiscoverFeedView { segment = .browse }
            } else {
                BrowseView(onSearch: onSearch)
            }
        }
        .background(BKColor.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Work.self) { WorkDetailView(work: $0) }
    }
}

/// "Pour toi" as a vertical feed (board *ExploreDiscover*, concept B):
/// one title per page, swipe up for the next, scroll back up to return.
/// Nothing is decided by scrolling — skipping is just scrolling — so the
/// only actions are on the right rail: À voir (also double tap), Déjà vu,
/// Partager. Tapping the title opens the fiche.
struct DiscoverFeedView: View {
    let onBrowse: () -> Void

    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(ToastCenter.self) private var toasts
    @Environment(DiscoverDeck.self) private var deck
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("bk.coach.feed") private var coachSeen = false

    @State private var position: Int?
    /// Page that just got a double tap, for the stamp animation.
    @State private var stampedId: String?

    var body: some View {
        Group {
            switch deck.phase {
            case .idle, .loading:
                DeckSkeleton()
            case .failed:
                DeckErrorState(onRetry: reload, onBrowse: onBrowse)
                    .padding(.vertical, BKSpace.md)
                    .padding(.bottom, BKSize.tabBarHeight + BKSpace.md)
            case .loaded:
                feed
            }
        }
        .task(id: library.hasLoaded) {
            guard library.hasLoaded else { return }
            await deck.loadIfNeeded(library: library.works, sfw: !userStore.profile.nsfwMode)
        }
        .task(id: deck.currentCard?.id) { await deck.enrichVisibleCards() }
    }

    private var feed: some View {
        ScrollView(.vertical) {
            LazyVStack(spacing: 0) {
                ForEach(deck.pool.indices, id: \.self) { i in
                    page(deck.pool[i])
                        .containerRelativeFrame(.vertical)
                }
                DeckEmptyState(onRestart: reload, onBrowse: onBrowse)
                    .padding(.vertical, BKSpace.md)
                    .padding(.bottom, BKSize.tabBarHeight + BKSpace.md)
                    .containerRelativeFrame(.vertical)
                    .id(deck.pool.count)
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollIndicators(.hidden)
        // The next page would otherwise peek into the home-indicator area.
        .clipped()
        .scrollPosition(id: $position)
        // Only explicit actions dismiss the coach mark: the scroll position
        // also moves on its own while the feed fills in.
        .onChange(of: position) { _, new in deck.setIndex(new ?? 0) }
        .overlay { if !coachSeen { FeedCoachMark { coachSeen = true } } }
    }

    // MARK: - Page

    private func page(_ work: Work) -> some View {
        let existing = library.work(id: work.id)
        return ZStack(alignment: .bottom) {
            BKCover(url: work.image)
            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.35), location: 0),
                    .init(color: .clear, location: 0.2),
                    .init(color: .clear, location: 0.4),
                    .init(color: .black.opacity(0.92), location: 1),
                ],
                startPoint: .top, endPoint: .bottom
            )

            VStack {
                HStack(alignment: .top) {
                    HStack(spacing: 6) {
                        ForEach(chips(for: work), id: \.self) { CardChip(text: $0) }
                    }
                    Spacer()
                    if let existing {
                        Label("DANS TA BIBLIO · \(existing.status.label.uppercased())", systemImage: "checkmark")
                            .font(BKFont.display(11))
                            .padding(.horizontal, 7).padding(.vertical, 4)
                            .foregroundStyle(.black)
                            .background(BKColor.greenText)
                    }
                }
                Spacer()
            }
            .padding(BKSpace.md)

            HStack(alignment: .bottom, spacing: BKSpace.md) {
                info(work)
                rail(work, existing: existing)
            }
            .padding(BKSpace.lg)

            if stampedId == work.id {
                FeedStamp()
                    .transition(.scale(scale: 1.6).combined(with: .opacity))
                    .frame(maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .contentShape(Rectangle())
        .onTapGesture(count: 2) { doubleTap(work) }
        .bkInkBorder()
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.sm)
        .padding(.bottom, BKSize.tabBarHeight + BKSpace.lg)
        .accessibilityElement(children: .combine)
        .accessibilityAction(named: "À voir") { toggle(.planToRead, work) }
        .accessibilityAction(named: "Déjà vu") { toggle(.completed, work) }
    }

    private func info(_ work: Work) -> some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            if let reason = deck.reasons[work.id] {
                Text(reason)
                    .font(BKFont.display(12, weight: .heavy))
                    .tracking(0.7)
                    .lineLimit(1)
                    .foregroundStyle(BKColor.brandCyan)
            }
            NavigationLink(value: work) {
                Text(work.title)
                    .font(BKFont.display(36))
                    .textCase(.uppercase)
                    .multilineTextAlignment(.leading)
                    .lineLimit(3)
                    .minimumScaleFactor(0.6)
                    .foregroundStyle(.white)
                    .shadow(color: .black, radius: 0, x: 3, y: 3)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Ouvre la fiche")
            if !work.genres.isEmpty {
                Text(work.genres.prefix(3).joined(separator: " · "))
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white)
            }
            if let synopsis = work.synopsis, !synopsis.isEmpty {
                NavigationLink(value: work) {
                    (Text(synopsis).foregroundStyle(Color(white: 0.85))
                     + Text("  Voir la fiche").bold().foregroundStyle(.white))
                        .font(.subheadline)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func rail(_ work: Work, existing: Work?) -> some View {
        VStack(spacing: BKSpace.lg) {
            RailButton(
                icon: existing?.status == .planToRead ? "checkmark" : "plus",
                label: "À VOIR",
                isOn: existing?.status == .planToRead,
                tint: BKColor.brandPink
            ) { toggle(.planToRead, work) }
            .accessibilityIdentifier("discover_btn_want_to_see")

            RailButton(
                icon: "eye.fill",
                label: "DÉJÀ VU",
                isOn: existing?.status == .completed,
                tint: BKColor.greenText
            ) { toggle(.completed, work) }
            .accessibilityIdentifier("discover_btn_seen")

            if let url = URL(string: "https://bingeki.web.app/fr/work/\(work.id)?type=\(work.type.rawValue)") {
                ShareLink(item: url, subject: Text(work.title)) {
                    RailIcon(icon: "arrowshape.turn.up.right.fill", label: "PARTAGER", isOn: false, tint: .white)
                }
                .accessibilityLabel("Partager \(work.title)")
            }
        }
    }

    private func chips(for work: Work) -> [String] {
        var chips = [work.type == .anime ? "ANIME" : "MANGA"]
        if let year = work.year { chips.append(String(year)) }
        if let total = work.total { chips.append(work.type == .anime ? "\(total) ÉP." : "\(total) CH.") }
        return chips
    }

    // MARK: - Actions

    private func reload() {
        position = 0
        Task { await deck.load(library: library.works, sfw: !userStore.profile.nsfwMode) }
    }

    /// Like TikTok's heart: double tap only ever adds, never removes.
    private func doubleTap(_ work: Work) {
        coachSeen = true
        withAnimation(reduceMotion ? .easeOut(duration: 0.15) : .spring(response: 0.3, dampingFraction: 0.5)) {
            stampedId = work.id
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(700))
            withAnimation(.easeOut(duration: 0.2)) { if stampedId == work.id { stampedId = nil } }
        }
        if library.work(id: work.id)?.status != .planToRead { toggle(.planToRead, work) }
    }

    /// Rail buttons toggle: tapping an active one takes the title back out,
    /// so there's no need for an undo toast.
    private func toggle(_ status: WorkStatus, _ work: Work) {
        coachSeen = true
        if let existing = library.work(id: work.id), existing.status == status {
            library.remove(id: work.id)
            HapticEngine.progressTick()
            return
        }
        var added = library.work(id: work.id) ?? work
        added.status = status
        if status == .completed {
            added.currentEpisode = added.totalEpisodes ?? 0
            added.currentChapter = added.totalChapters ?? 0
        }
        if added.dateAdded == nil { added.dateAdded = .now }
        added.lastUpdated = .now
        let isNew = library.work(id: work.id) == nil
        library.upsert(added)
        if isNew { userStore.addXP(GamificationCore.XPReward.addWork) }
        if status == .completed { HapticEngine.success() } else { HapticEngine.added() }
        toasts.show(status == .completed ? "\(work.title) → Terminé" : "\(work.title) → À voir")
    }
}

/// Round action on the feed's right rail.
private struct RailButton: View {
    let icon: String
    let label: String
    let isOn: Bool
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) { RailIcon(icon: icon, label: label, isOn: isOn, tint: tint) }
            .buttonStyle(.plain)
            .accessibilityLabel(label.capitalized)
            .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

private struct RailIcon: View {
    let icon: String
    let label: String
    let isOn: Bool
    let tint: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3.weight(.black))
                .foregroundStyle(isOn ? .black : .white)
                .frame(width: 54, height: 54)
                .background(isOn ? tint : .black.opacity(0.45))
                .overlay(Rectangle().stroke(isOn ? .black : .white.opacity(0.7), lineWidth: 2))
            Text(label)
                .font(BKFont.display(10, weight: .heavy))
                .foregroundStyle(.white)
                .shadow(color: .black, radius: 2)
        }
        .frame(minWidth: 60)
        .contentShape(Rectangle())
    }
}

/// Double-tap feedback, the feed's equivalent of TikTok's heart.
private struct FeedStamp: View {
    var body: some View {
        Text("+ À VOIR")
            .font(BKFont.display(34))
            .foregroundStyle(.white)
            .padding(.horizontal, 14).padding(.vertical, 6)
            .background(BKColor.brandPink)
            .overlay(Rectangle().stroke(.black, lineWidth: 3))
            .rotationEffect(.degrees(-8))
            .shadow(color: .black.opacity(0.5), radius: 0, x: 4, y: 4)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }
}

private struct CardChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(BKFont.display(11, weight: .heavy))
            .tracking(0.6)
            .padding(.horizontal, 7).padding(.vertical, 4)
            .foregroundStyle(.white)
            .background(.black.opacity(0.6))
            .overlay(Rectangle().stroke(.white.opacity(0.55), lineWidth: 1.5))
    }
}

/// États #3 — skeleton shaped like a feed page, no spinner.
private struct DeckSkeleton: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Rectangle().fill(BKColor.surfaceTint)
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: BKSpace.sm) {
                    Rectangle().fill(BKColor.surface).frame(width: 180, height: 12)
                    Rectangle().fill(BKColor.surface).frame(width: 220, height: 36)
                    Rectangle().fill(BKColor.surface).frame(width: 200, height: 12)
                }
                Spacer()
                VStack(spacing: BKSpace.lg) {
                    ForEach(0..<3, id: \.self) { _ in Rectangle().fill(BKColor.surface).frame(width: 54, height: 54) }
                }
            }
            .padding(BKSpace.lg)
        }
        .bkInkBorder(BKColor.border)
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.sm)
        .padding(.bottom, BKSize.tabBarHeight + BKSpace.lg)
        .opacity(pulse ? 0.55 : 1)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 0.9).repeatForever()) { pulse = true }
        }
        .accessibilityLabel("Chargement de ta sélection")
    }
}

/// États #7 — feed error: retry, or fall back to Parcourir.
private struct DeckErrorState: View {
    let onRetry: () -> Void
    let onBrowse: () -> Void

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Text("BZZT!")
                .font(BKFont.display(44))
                .foregroundStyle(BKColor.accentText)
                .rotationEffect(.degrees(-4))
            Text("Le feed a buggé")
                .font(BKFont.title3)
                .bkLabelStyle()
            Text("Les serveurs de données manga ne répondent pas. Ta biblio, elle, va bien.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(BKColor.textSecondary)
            BKPrimaryButton(title: "Réessayer", systemImage: "arrow.clockwise", action: onRetry)
            Button("Parcourir à la place", action: onBrowse)
                .font(.subheadline.weight(.semibold))
                .underline()
                .foregroundStyle(BKColor.textPrimary)
                .frame(minHeight: BKSize.minTapTarget)
        }
        .padding(BKSpace.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BKColor.surface)
        .bkInkBorder()
        .padding(.horizontal, BKSpace.screenMargin)
    }
}

private struct DeckEmptyState: View {
    let onRestart: () -> Void
    let onBrowse: () -> Void

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Text("Tout vu !").font(BKFont.title1).foregroundStyle(BKColor.cyanText)
            Text("Ajoute des titres à ta biblio pour affiner la sélection.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(BKColor.textSecondary)
            BKOutlineButton(title: "Nouvelle sélection", systemImage: "arrow.clockwise", action: onRestart)
                .frame(width: 240)
            Button("Parcourir le catalogue", action: onBrowse)
                .font(.subheadline.weight(.semibold))
                .underline()
                .foregroundStyle(BKColor.textPrimary)
                .frame(minHeight: BKSize.minTapTarget)
                .accessibilityIdentifier("deck_empty_browse")
        }
        .padding(BKSpace.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BKColor.surface)
        .bkInkBorder()
        .padding(.horizontal, BKSpace.screenMargin)
    }
}

/// États #2 — gesture tutorial over the feed, shown once.
private struct FeedCoachMark: View {
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.74).ignoresSafeArea()
            VStack(spacing: BKSpace.xl) {
                hint("arrow.up", "Glisse vers le haut", "pour le titre suivant", color: BKColor.brandCyan)
                hint("hand.tap.fill", "Double tap", "pour l'ajouter à À voir", color: BKColor.brandPink)
                Button(action: onDismiss) {
                    Text("COMPRIS")
                        .font(BKFont.ctaLabel)
                        .frame(width: 180, height: 52)
                        .foregroundStyle(.black)
                        .background(.white)
                        .clipShape(BKChamferedShape(cut: 8))
                }
            }
            .padding(BKSpace.lg)
        }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
    }

    private func hint(_ icon: String, _ title: String, _ detail: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 38, weight: .black)).foregroundStyle(color)
            Text(title).font(BKFont.display(18)).textCase(.uppercase).foregroundStyle(color)
            Text(detail).font(.subheadline).foregroundStyle(Color(white: 0.85))
        }
    }
}

#Preview {
    NavigationStack {
        DiscoverView(segment: .constant(.forYou))
    }
    .environment(\.libraryStore, InMemoryLibraryStore.preview)
    .environment(\.userStore, InMemoryUserStore.preview)
    .environment(ToastCenter())
    .environment(DiscoverDeck(pool: Work.sampleLibrary))
}
