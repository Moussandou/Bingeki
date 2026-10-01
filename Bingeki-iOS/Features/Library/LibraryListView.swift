import SwiftUI

/// Bibliothèque — status pills, type filter, rows with `+1` (board `S07-Library`).
struct LibraryListView: View {
    @Binding var selectedTab: RootTab
    let onSearch: () -> Void

    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @State private var filter: WorkStatus = .reading
    @State private var typeFilter: WorkType?
    @State private var sortByTitle = false
    @State private var sheetWork: Work?

    private var rows: [Work] {
        let byStatus = library.works(status: filter).filter { typeFilter == nil || $0.type == typeFilter }
        return sortByTitle
            ? byStatus.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
            : byStatus
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if library.hasLoaded && library.works.isEmpty {
                LibraryEmptyState(onDiscover: { selectedTab = .discover }, onSearch: onSearch)
            } else {
                statusPills
                typeTabs
                list
            }
        }
        .background(BKColor.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Work.self) { WorkDetailView(work: $0) }
        .task(id: library.hasLoaded) {
            // Open on the first non-empty status rather than an empty "En cours".
            guard library.works(status: filter).isEmpty,
                  let first = WorkStatus.allCases.first(where: { !library.works(status: $0).isEmpty }) else { return }
            filter = first
        }
        .sheet(item: $sheetWork) { work in
            ProgressSheetView(work: work)
                .presentationDetents([.height(640), .large])
        }
    }

    private var header: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Biblio").font(BKFont.largeTitle).bkLabelStyle()
                let done = library.works(status: .completed).count
                Text("\(library.works.count) titres · \(done) terminés")
                    .font(.caption)
                    .foregroundStyle(BKColor.textSecondary)
            }
            Spacer()
            Button {
                sortByTitle.toggle()
            } label: {
                Image(systemName: sortByTitle ? "textformat" : "clock")
                    .font(.body.weight(.bold))
                    .frame(width: 44, height: 44)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
            }
            .accessibilityLabel(sortByTitle ? "Tri : titre" : "Tri : activité récente")
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.lg)
    }

    private var statusPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: BKSpace.sm) {
                ForEach(WorkStatus.allCases, id: \.self) { status in
                    let count = library.works(status: status).count
                    Button {
                        filter = status
                    } label: {
                        BKStatusChip(status: status, isSelected: filter == status, count: count)
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(filter == status ? .isSelected : [])
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
        }
        .padding(.top, BKSpace.lg)
    }

    private var typeTabs: some View {
        HStack(spacing: 18) {
            typeTab("TOUT", nil)
            typeTab("ANIME", .anime)
            typeTab("MANGA", .manga)
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.xs)
    }

    private func typeTab(_ label: String, _ type: WorkType?) -> some View {
        let isOn = typeFilter == type
        return Button {
            typeFilter = type
        } label: {
            Text(label)
                .font(BKFont.display(13, weight: .heavy))
                .tracking(0.8)
                .padding(.top, 10).padding(.bottom, 4)
                .foregroundStyle(isOn ? BKColor.textPrimary : BKColor.textSecondary)
                .overlay(alignment: .bottom) {
                    if isOn { Rectangle().fill(BKColor.textPrimary).frame(height: 2) }
                }
                .frame(minHeight: BKSize.minTapTarget)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    @ViewBuilder
    private var list: some View {
        if rows.isEmpty {
            Text(filter == .reading
                 ? "Rien en cours. Lance un titre de ta liste À voir."
                 : "Aucun titre « \(filter.label) » pour l'instant.")
                .font(.subheadline)
                .foregroundStyle(BKColor.textSecondary)
                .padding(BKSpace.screenMargin)
            Spacer()
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(rows) { work in
                        LibraryRow(work: work, onOpen: { sheetWork = work }) {
                            var updated = work
                            let wasCompleted = updated.status == .completed
                            updated.incrementProgress(by: 1)
                            library.upsert(updated)
                            userStore.addXP(GamificationCore.XPReward.updateProgress)
                            if !wasCompleted, updated.status == .completed {
                                userStore.addXP(GamificationCore.XPReward.completeWork)
                            }
                            HapticEngine.progressTick()
                        }
                    }
                }
            }
        }
    }
}

private struct LibraryRow: View {
    let work: Work
    let onOpen: () -> Void
    let onIncrement: () -> Void

    var body: some View {
        HStack(spacing: BKSpace.md) {
            Button(action: onOpen) {
                HStack(spacing: BKSpace.md) {
                    BKCover(url: work.imageSmall ?? work.image).frame(width: 48, height: 68)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(work.title).font(.subheadline.weight(.bold)).lineLimit(1)
                        Text(meta).font(.caption).foregroundStyle(BKColor.textSecondary).lineLimit(1)
                        GeometryReader { proxy in
                            ZStack(alignment: .leading) {
                                Rectangle().fill(BKColor.surfaceTint)
                                Rectangle().fill(BKColor.brandPink)
                                    .frame(width: proxy.size.width * work.progressFraction)
                            }
                        }
                        .frame(height: 4)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(work.title), \(meta), modifier la progression")

            if work.status == .reading || work.status == .planToRead {
                Button("+1", action: onIncrement)
                    .font(BKFont.display(16))
                    .frame(width: 52, height: 44)
                    .foregroundStyle(BKColor.accentText)
                    .overlay(Rectangle().stroke(BKColor.brandPink, lineWidth: 2))
                    .accessibilityLabel("Plus un pour \(work.title)")
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .frame(height: 88)
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
    }

    private var meta: String {
        let unit = work.type == .anime ? "Ép." : "Ch."
        var text = "\(unit) \(work.progress)" + (work.total.map { " / \($0)" } ?? "")
        if let date = work.lastUpdated {
            text += " · " + date.formatted(.relative(presentation: .named))
        }
        return text
    }
}

/// États #4 — empty library: one action, discover.
private struct LibraryEmptyState: View {
    let onDiscover: () -> Void
    let onSearch: () -> Void

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Spacer()
            Image(systemName: "questionmark")
                .font(.system(size: 40, weight: .black))
                .foregroundStyle(BKColor.textSecondary)
                .frame(width: 96, height: 128)
                .overlay(Rectangle().stroke(BKColor.border, style: StrokeStyle(lineWidth: 2, dash: [6, 5])))
                .rotationEffect(.degrees(-3))
            Text("Page blanche").font(BKFont.title1).bkLabelStyle()
            Text("Ta biblio attend son premier titre. Swipe quelques cartes, on s'occupe du reste.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(BKColor.textSecondary)
            BKPrimaryButton(title: "Découvrir des titres", systemImage: "safari", action: onDiscover)
            Button("Rechercher un titre", action: onSearch)
                .font(.subheadline.weight(.semibold))
                .underline()
                .foregroundStyle(BKColor.textPrimary)
                .frame(minHeight: BKSize.minTapTarget)
            Spacer()
        }
        .padding(.horizontal, BKSpace.xl)
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationStack {
        LibraryListView(selectedTab: .constant(.library), onSearch: {})
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
            .environment(\.userStore, InMemoryUserStore.preview)
    }
}
