import SwiftUI

/// Découvrir — segmented "Pour toi" (swipe deck) / "Parcourir" (grid),
/// mirroring boards `S02`–`S04`.
struct DiscoverView: View {
    enum Segment: String, CaseIterable { case forYou = "POUR TOI", browse = "PARCOURIR" }
    @State private var segment: Segment = .forYou

    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $segment) {
                ForEach(Segment.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.top, BKSpace.sm)

            if segment == .forYou {
                DiscoverFeedView()
            } else {
                BrowseView()
            }
        }
        .background(BKColor.background)
    }
}

/// Swipeable deck: drag right → add to "À voir", drag left → pass, drag up
/// → skip without deciding (board *ExploreDiscover*, concept B×A).
struct DiscoverFeedView: View {
    @Environment(InMemoryLibraryStore.self) private var library
    @Environment(InMemoryUserStore.self) private var userStore
    @Environment(ToastCenter.self) private var toasts
    @Environment(DiscoverDeck.self) private var deck

    @State private var dragOffset: CGSize = .zero
    @State private var showCoachMark = false

    var body: some View {
        VStack(spacing: BKSpace.xl) {
            if let card = deck.currentCard {
                ZStack {
                    if let next = deck.nextCard {
                        cardView(next, interactive: false)
                            .scaleEffect(0.95)
                            .offset(y: 10)
                            .opacity(0.6)
                    }
                    cardView(card, interactive: true)
                        .offset(dragOffset)
                        .rotationEffect(.degrees(dragOffset.width / 20))
                        .gesture(dragGesture(for: card))
                        .animation(.interactiveSpring, value: dragOffset)
                }
                .padding(.horizontal, BKSpace.screenMargin)

                actionBar(for: card)
            } else {
                DeckEmptyState { deck.reset() }
            }
        }
        .padding(.top, BKSpace.md)
    }

    private func cardView(_ work: Work, interactive: Bool) -> some View {
        ZStack(alignment: .bottomLeading) {
            BKCover(url: work.image)
            LinearGradient(
                colors: [.clear, .clear, .black.opacity(0.9)],
                startPoint: .top, endPoint: .bottom
            )
            VStack(alignment: .leading, spacing: BKSpace.sm) {
                Text("PARCE QUE TU AIMES DES TITRES SIMILAIRES")
                    .font(BKFont.caption).foregroundStyle(BKColor.brandCyan)
                Text(work.title).font(BKFont.title1).foregroundStyle(.white)
                Text(work.genres.joined(separator: " · "))
                    .font(.caption.weight(.semibold)).foregroundStyle(.white)
            }
            .padding(BKSpace.lg)

            if interactive {
                HStack {
                    swipeStamp("PASSER", visible: dragOffset.width < -40, color: .white)
                    Spacer()
                    swipeStamp("+ À VOIR", visible: dragOffset.width > 40, color: BKColor.brandPink)
                }
                .padding(BKSpace.lg)
            }
        }
        .frame(height: 500)
        .bkInkBorder()
        .bkPanelShadow()
    }

    private func swipeStamp(_ text: String, visible: Bool, color: Color) -> some View {
        Text(text)
            .font(BKFont.display(24))
            .foregroundStyle(color)
            .padding(6)
            .overlay(RoundedRectangle(cornerRadius: 0).stroke(color, lineWidth: 4))
            .rotationEffect(.degrees(-10))
            .opacity(visible ? 1 : 0)
    }

    private func actionBar(for work: Work) -> some View {
        HStack(spacing: 22) {
            actionButton("xmark", label: "PASSER") { decide(.left, for: work) }
            Button {
                decide(.right, for: work)
            } label: {
                Label("+ À VOIR", systemImage: "plus")
                    .font(BKFont.ctaLabel)
                    .frame(width: 172, height: 60)
                    .foregroundStyle(.white)
                    .background(BKColor.ctaFill)
                    .clipShape(BKChamferedShape(cut: 10))
            }
            actionButton("checkmark", label: "DÉJÀ VU") { decide(.seen, for: work) }
        }
    }

    private func actionButton(_ icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.title3.weight(.bold))
                    .frame(width: 56, height: 56)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
                Text(label).font(BKFont.display(11))
            }
        }
        .foregroundStyle(BKColor.textSecondary)
    }

    private func dragGesture(for work: Work) -> some Gesture {
        DragGesture()
            .onChanged { dragOffset = $0.translation }
            .onEnded { value in
                if value.translation.width > 100 {
                    decide(.right, for: work)
                } else if value.translation.width < -100 {
                    decide(.left, for: work)
                } else {
                    dragOffset = .zero
                }
            }
    }

    private enum Decision { case left, right, seen }

    private func decide(_ decision: Decision, for work: Work) {
        switch decision {
        case .right:
            var added = work
            added.status = .planToRead
            library.upsert(added)
            userStore.addXP(GamificationCore.XPReward.addWork)
            HapticEngine.added()
            let previous = library.works
            toasts.show("\(work.title) → À voir") { [weak library] in
                library?.remove(id: work.id)
                _ = previous
            }
        case .seen:
            var added = work
            added.status = .completed
            added.currentEpisode = added.totalEpisodes ?? 0
            added.currentChapter = added.totalChapters ?? 0
            library.upsert(added)
            userStore.addXP(GamificationCore.XPReward.addWork)
            HapticEngine.success()
            toasts.show("\(work.title) → Terminé")
        case .left:
            toasts.show("Passé · moins de titres comme ça")
        }
        withAnimation(.spring) {
            dragOffset = .zero
            deck.advance()
        }
    }
}

private struct DeckEmptyState: View {
    let onRestart: () -> Void

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Text("Tout vu !").font(BKFont.title1).foregroundStyle(BKColor.brandCyan)
            Text("Nouvelle sélection demain matin.")
                .font(.subheadline).foregroundStyle(BKColor.textSecondary)
            BKOutlineButton(title: "Revoir la sélection", action: onRestart)
                .frame(width: 220)
        }
        .frame(maxWidth: .infinity, minHeight: 500)
        .background(BKColor.surface)
        .bkInkBorder()
        .padding(.horizontal, BKSpace.screenMargin)
    }
}

/// Holds the deck's position — shared across the tab so it survives
/// switching to Home and back.
@MainActor
@Observable
final class DiscoverDeck {
    private(set) var pool: [Work]
    private(set) var index = 0

    init(pool: [Work]) { self.pool = pool }

    var currentCard: Work? { pool.indices.contains(index) ? pool[index] : nil }
    var nextCard: Work? { pool.indices.contains(index + 1) ? pool[index + 1] : nil }

    func advance() { index += 1 }
    func reset() { index = 0 }
}

#Preview {
    DiscoverView()
        .environment(InMemoryLibraryStore.preview)
        .environment(InMemoryUserStore.preview)
        .environment(ToastCenter())
        .environment(DiscoverDeck(pool: Work.sampleLibrary))
}
