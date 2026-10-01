import SwiftUI

/// Découvrir — "Pour toi" (swipe deck) / "Parcourir" (grid), boards `S02`–`S04`.
struct DiscoverView: View {
    var onSearch: () -> Void = {}

    enum Segment: String, CaseIterable { case forYou = "POUR TOI", browse = "PARCOURIR" }
    @State private var segment: Segment = {
        #if DEBUG
        // `-bk.discoverSegment browse` for simulator screenshots
        if UserDefaults.standard.string(forKey: "bk.discoverSegment") == "browse" { return .browse }
        #endif
        return .forYou
    }()

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

/// Swipe deck: → À voir, ← passer, ↑ suivant sans avis (board *ExploreDiscover*).
struct DiscoverFeedView: View {
    let onBrowse: () -> Void

    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(ToastCenter.self) private var toasts
    @Environment(DiscoverDeck.self) private var deck
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("bk.coach.swipe") private var coachSeen = false

    @State private var dragOffset: CGSize = .zero

    // Fixed chrome around the card: top pad + gap + action bar + bottom pad.
    private static let chromeHeight: CGFloat = BKSpace.md + BKSpace.xl + 80 + BKSpace.lg

    var body: some View {
        GeometryReader { proxy in
            content(cardHeight: min(524, max(300, proxy.size.height - Self.chromeHeight)))
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
        }
        .task(id: library.hasLoaded) {
            guard library.hasLoaded else { return }
            await deck.loadIfNeeded(library: library.works, sfw: !userStore.profile.nsfwMode)
        }
        .task(id: deck.currentCard?.id) { await deck.enrichVisibleCards() }
    }

    @ViewBuilder
    private func content(cardHeight: CGFloat) -> some View {
        VStack(spacing: BKSpace.xl) {
            switch deck.phase {
            case .idle, .loading:
                DeckSkeleton(cardHeight: cardHeight)
            case .failed:
                DeckErrorState(onRetry: reload, onBrowse: onBrowse)
                    .frame(height: cardHeight)
            case .loaded:
                if let card = deck.currentCard {
                    ZStack {
                        if let next = deck.nextCard {
                            cardView(next, interactive: false, height: cardHeight)
                                .scaleEffect(0.95)
                                .offset(y: 10)
                                .opacity(0.6)
                        }
                        cardView(card, interactive: true, height: cardHeight)
                            .offset(dragOffset)
                            .rotationEffect(.degrees(reduceMotion ? 0 : dragOffset.width / 20))
                            .gesture(dragGesture(for: card))
                            .animation(.interactiveSpring, value: dragOffset)
                            .accessibilityElement(children: .combine)
                            .accessibilityAction(named: "À voir") { decide(.right, for: card) }
                            .accessibilityAction(named: "Passer") { decide(.left, for: card) }
                            .accessibilityAction(named: "Déjà vu") { decide(.seen, for: card) }
                    }
                    .padding(.horizontal, BKSpace.screenMargin)
                    .overlay { if !coachSeen { SwipeCoachMark { coachSeen = true } } }

                    actionBar(for: card)
                } else {
                    DeckEmptyState(onRestart: reload)
                        .frame(height: cardHeight)
                }
            }
        }
        .padding(.top, BKSpace.md)
        .padding(.bottom, BKSpace.lg)
    }

    private func reload() {
        Task { await deck.load(library: library.works, sfw: !userStore.profile.nsfwMode) }
    }

    private func cardView(_ work: Work, interactive: Bool, height: CGFloat) -> some View {
        ZStack(alignment: .bottomLeading) {
            BKCover(url: work.image)
            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.35), location: 0),
                    .init(color: .clear, location: 0.22),
                    .init(color: .clear, location: 0.42),
                    .init(color: .black.opacity(0.92), location: 1),
                ],
                startPoint: .top, endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: BKSpace.sm) {
                if let reason = deck.reasons[work.id] {
                    Text(reason)
                        .font(BKFont.display(12, weight: .heavy))
                        .tracking(0.7)
                        .lineLimit(1)
                        .foregroundStyle(BKColor.brandCyan)
                }
                Text(work.title)
                    .font(BKFont.display(40))
                    .textCase(.uppercase)
                    .lineLimit(2)
                    .minimumScaleFactor(0.6)
                    .foregroundStyle(.white)
                    .shadow(color: .black, radius: 0, x: 3, y: 3)
                if !work.genres.isEmpty {
                    Text(work.genres.prefix(3).joined(separator: " · "))
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                }
                if let synopsis = work.synopsis, !synopsis.isEmpty {
                    Text(synopsis)
                        .font(.subheadline)
                        .lineLimit(3)
                        .foregroundStyle(Color(white: 0.85))
                }
            }
            .padding(BKSpace.lg)

            VStack {
                HStack(alignment: .top) {
                    HStack(spacing: 6) {
                        ForEach(chips(for: work), id: \.self) { CardChip(text: $0) }
                    }
                    Spacer()
                    if let existing = library.work(id: work.id) {
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

            if interactive {
                VStack {
                    HStack {
                        SwipeStamp(text: "PASSER", color: .white).opacity(dragOffset.width < -40 ? 1 : 0)
                        Spacer()
                        SwipeStamp(text: "+ À VOIR", color: BKColor.brandPink).opacity(dragOffset.width > 40 ? 1 : 0)
                    }
                    .padding(.top, 56)
                    Spacer()
                }
                .padding(.horizontal, BKSpace.lg)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .contentShape(Rectangle())
        .bkInkBorder()
        .bkPanelShadow()
        .overlay {
            NavigationLink(value: work) { Color.clear.contentShape(Rectangle()) }
                .allowsHitTesting(interactive)
                .accessibilityHidden(true)
        }
    }

    private func chips(for work: Work) -> [String] {
        var chips = [work.type == .anime ? "ANIME" : "MANGA"]
        if let year = work.year { chips.append(String(year)) }
        if let total = work.total { chips.append(work.type == .anime ? "\(total) ÉP." : "\(total) CH.") }
        return chips
    }

    private func actionBar(for work: Work) -> some View {
        HStack(alignment: .top, spacing: 22) {
            actionButton("xmark", label: "PASSER", a11y: "Passer, pas intéressé", identifier: "discover_btn_pass") { decide(.left, for: work) }
            Button {
                decide(.right, for: work)
            } label: {
                Label("À VOIR", systemImage: "plus")
                    .font(BKFont.display(18))
                    .frame(width: 172, height: 60)
                    .foregroundStyle(.white)
                    .background(BKColor.ctaFill)
                    .clipShape(BKChamferedShape(cut: 10))
            }
            .accessibilityLabel("Ajouter à À voir")
            .accessibilityIdentifier("discover_btn_want_to_see")
            actionButton("checkmark", label: "DÉJÀ VU", a11y: "Déjà vu, ajouter en terminé", identifier: "discover_btn_seen") { decide(.seen, for: work) }
        }
    }

    private func actionButton(_ icon: String, label: String, a11y: String, identifier: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(BKColor.textPrimary)
                    .frame(width: 56, height: 56)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
                Text(label).font(BKFont.display(11, weight: .heavy))
            }
        }
        .foregroundStyle(BKColor.textSecondary)
        .accessibilityLabel(a11y)
        .accessibilityIdentifier(identifier)
    }

    private func dragGesture(for work: Work) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { dragOffset = $0.translation }
            .onEnded { value in
                let t = value.translation
                if t.width > 100 {
                    decide(.right, for: work)
                } else if t.width < -100 {
                    decide(.left, for: work)
                } else if t.height < -120, abs(t.width) < 80 {
                    decide(.skip, for: work)
                } else {
                    dragOffset = .zero
                }
            }
    }

    private enum Decision { case left, right, seen, skip }

    private func decide(_ decision: Decision, for work: Work) {
        coachSeen = true
        switch decision {
        case .right:
            var added = work
            added.status = .planToRead
            added.dateAdded = .now
            added.lastUpdated = .now
            library.upsert(added)
            userStore.addXP(GamificationCore.XPReward.addWork)
            HapticEngine.added()
            toasts.show("\(work.title) → À voir") { [weak library] in
                library?.remove(id: work.id)
            }
        case .seen:
            var added = work
            added.status = .completed
            added.currentEpisode = added.totalEpisodes ?? 0
            added.currentChapter = added.totalChapters ?? 0
            added.dateAdded = .now
            added.lastUpdated = .now
            library.upsert(added)
            userStore.addXP(GamificationCore.XPReward.addWork)
            HapticEngine.success()
            toasts.show("\(work.title) → Terminé") { [weak library] in
                library?.remove(id: work.id)
            }
        case .left:
            deck.markPassed(work)
            toasts.show("Passé · moins de titres comme ça")
        case .skip:
            break
        }
        withAnimation(reduceMotion ? .easeOut(duration: 0.15) : .spring) {
            dragOffset = .zero
            deck.advance()
        }
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

private struct SwipeStamp: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(BKFont.display(24))
            .foregroundStyle(color)
            .padding(6)
            .overlay(Rectangle().stroke(color, lineWidth: 4))
            .rotationEffect(.degrees(-10))
    }
}

/// États #3 — skeleton shaped like the real card, no spinner.
private struct DeckSkeleton: View {
    let cardHeight: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        VStack(spacing: BKSpace.xl) {
            ZStack(alignment: .bottomLeading) {
                Rectangle().fill(BKColor.surfaceTint)
                VStack(alignment: .leading, spacing: BKSpace.sm) {
                    Rectangle().fill(BKColor.surface).frame(width: 180, height: 12)
                    Rectangle().fill(BKColor.surface).frame(width: 240, height: 36)
                    Rectangle().fill(BKColor.surface).frame(width: 200, height: 12)
                }
                .padding(BKSpace.lg)
            }
            .frame(height: cardHeight)
            .bkInkBorder(BKColor.border)
            .padding(.horizontal, BKSpace.screenMargin)

            HStack(spacing: 22) {
                Rectangle().fill(BKColor.surfaceTint).frame(width: 56, height: 56)
                Rectangle().fill(BKColor.surfaceTint).frame(width: 172, height: 60)
                Rectangle().fill(BKColor.surfaceTint).frame(width: 56, height: 56)
            }
        }
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

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Text("Tout vu !").font(BKFont.title1).foregroundStyle(BKColor.cyanText)
            Text("Ajoute des titres à ta biblio pour affiner la sélection.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(BKColor.textSecondary)
            BKOutlineButton(title: "Nouvelle sélection", systemImage: "arrow.clockwise", action: onRestart)
                .frame(width: 240)
        }
        .padding(BKSpace.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BKColor.surface)
        .bkInkBorder()
        .padding(.horizontal, BKSpace.screenMargin)
    }
}

/// États #2 — gesture tutorial over the card, shown once.
private struct SwipeCoachMark: View {
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.74)
            VStack(spacing: BKSpace.xl) {
                direction("arrow.up", "Suivant sans avis", color: BKColor.brandCyan, size: 30)
                HStack {
                    direction("arrow.left", "Passer", color: .white, size: 38)
                    Spacer()
                    Circle()
                        .strokeBorder(.white, style: StrokeStyle(lineWidth: 3, dash: [6, 5]))
                        .frame(width: 74, height: 74)
                        .overlay(Circle().fill(.white).frame(width: 30, height: 30))
                        .accessibilityHidden(true)
                    Spacer()
                    direction("arrow.right", "À voir", color: BKColor.brandPink, size: 38)
                }
                .padding(.horizontal, BKSpace.lg)
                Text("Les boutons sous la carte font la même chose.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color(white: 0.85))
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
        .padding(.horizontal, BKSpace.screenMargin)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
    }

    private func direction(_ icon: String, _ label: String, color: Color, size: CGFloat) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: size, weight: .black))
            Text(label).font(BKFont.display(16)).textCase(.uppercase)
        }
        .foregroundStyle(color)
    }
}

#Preview {
    NavigationStack {
        DiscoverView()
    }
    .environment(\.libraryStore, InMemoryLibraryStore.preview)
    .environment(\.userStore, InMemoryUserStore.preview)
    .environment(ToastCenter())
    .environment(DiscoverDeck(pool: Work.sampleLibrary))
}
