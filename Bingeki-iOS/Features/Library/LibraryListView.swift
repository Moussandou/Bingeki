import SwiftUI

/// Bibliothèque — status pills, type filter, rows with `+1` (board `S07-Library`).
struct LibraryListView: View {
    @Binding var selectedTab: RootTab
    let onSearch: () -> Void

    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @State private var filter: WorkStatus = .reading
    @State private var typeFilter: WorkType?
    @AppStorage("bk.librarySort") private var sort: LibrarySort = .recent
    @State private var sheetWork: Work?
    /// Non-nil while in multi-select mode.
    @State private var selection: Set<String>?
    @State private var confirmingRemoval = false

    private var rows: [Work] {
        sort.apply(to: library.works(status: filter).filter { typeFilter == nil || $0.type == typeFilter })
    }

    private var isSelecting: Bool { selection != nil }

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
        .safeAreaInset(edge: .bottom) {
            if let selection { selectionBar(selection) }
        }
        .onChange(of: filter) { if isSelecting { selection = [] } }
        .onChange(of: typeFilter) { if isSelecting { selection = [] } }
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
            if !isSelecting { BKSearchButton(action: onSearch) }
            if isSelecting {
                Button("OK") { selection = nil }
                    .font(BKFont.display(15, weight: .heavy))
                    .frame(minWidth: 56, minHeight: 44)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
                    .accessibilityIdentifier("library_select_done")
            } else {
                Menu {
                    Picker("Trier par", selection: $sort) {
                        ForEach(LibrarySort.allCases, id: \.self) { option in
                            Label(option.label, systemImage: option.icon).tag(option)
                        }
                    }
                } label: {
                    headerIcon(sort.icon)
                }
                .accessibilityLabel("Tri : \(sort.label)")
                .accessibilityIdentifier("library_sort_menu")

                Button { selection = [] } label: { headerIcon("checkmark.circle") }
                    .disabled(rows.isEmpty)
                    .accessibilityLabel("Sélectionner plusieurs titres")
                    .accessibilityIdentifier("library_select_button")
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.lg)
    }

    private func headerIcon(_ systemName: String) -> some View {
        Image(systemName: systemName)
            .font(.body.weight(.bold))
            .frame(width: 44, height: 44)
            .foregroundStyle(BKColor.textPrimary)
            .background(BKColor.surface)
            .bkInkBorder(BKColor.border)
    }

    private func selectionBar(_ selected: Set<String>) -> some View {
        HStack(spacing: BKSpace.md) {
            Button(selected.count == rows.count ? "Aucun" : "Tout") {
                selection = selected.count == rows.count ? [] : Set(rows.map(\.id))
            }
            .font(.subheadline.weight(.semibold))
            .frame(minHeight: 44)
            Text("\(selected.count) sélectionné\(selected.count > 1 ? "s" : "")")
                .font(.caption)
                .foregroundStyle(BKColor.textSecondary)
            Spacer()
            Group {
                Menu {
                    ForEach(WorkStatus.allCases.filter { $0 != filter }, id: \.self) { status in
                        Button(status.label) { move(selected, to: status) }
                    }
                } label: {
                    Label("Statut", systemImage: "arrow.right.circle")
                        .font(.subheadline.weight(.bold))
                        .frame(minHeight: 44)
                }
                .accessibilityIdentifier("library_bulk_status")
                Button(role: .destructive) { confirmingRemoval = true } label: {
                    Image(systemName: "trash").font(.body.weight(.bold)).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Retirer de la biblio")
                .confirmationDialog(
                    "Retirer \(selected.count) titre\(selected.count > 1 ? "s" : "") de ta biblio ?",
                    isPresented: $confirmingRemoval,
                    titleVisibility: .visible
                ) {
                    Button("Retirer", role: .destructive) { remove(selected) }
                }
            }
            .disabled(selected.isEmpty)
        }
        .foregroundStyle(BKColor.textPrimary)
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.vertical, BKSpace.sm)
        .background(BKColor.surface)
        .overlay(alignment: .top) { Rectangle().fill(BKColor.border).frame(height: 2) }
        .padding(.bottom, BKSize.tabBarHeight + BKSpace.sm)
    }

    private func move(_ ids: Set<String>, to status: WorkStatus) {
        for id in ids {
            guard var work = library.work(id: id) else { continue }
            work.status = status
            work.lastUpdated = .now
            library.upsert(work)
        }
        HapticEngine.success()
        selection = nil
    }

    private func remove(_ ids: Set<String>) {
        ids.forEach { library.remove(id: $0) }
        HapticEngine.success()
        selection = nil
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
                        if let selected = selection {
                            SelectableRow(work: work, isSelected: selected.contains(work.id)) {
                                selection?.formSymmetricDifference([work.id])
                            }
                        } else {
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

/// Row in multi-select mode: the whole row toggles, no `+1`.
private struct SelectableRow: View {
    let work: Work
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: BKSpace.md) {
                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(isSelected ? BKColor.brandPink : BKColor.textSecondary)
                BKCover(url: work.imageSmall ?? work.image).frame(width: 48, height: 68)
                VStack(alignment: .leading, spacing: 5) {
                    Text(work.title).font(.subheadline.weight(.bold)).lineLimit(1)
                    if let rating = work.rating {
                        Text("Note \(rating)/10").font(.caption).foregroundStyle(BKColor.textSecondary)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .frame(height: 88)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
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

/// Library sort order, persisted per device.
enum LibrarySort: String, CaseIterable {
    case recent, title, rating, progress

    var label: String {
        switch self {
        case .recent: "Activité récente"
        case .title: "Titre"
        case .rating: "Note"
        case .progress: "Progression"
        }
    }

    var icon: String {
        switch self {
        case .recent: "clock"
        case .title: "textformat"
        case .rating: "star"
        case .progress: "chart.bar.fill"
        }
    }

    /// Input arrives most-recent-first; `sorted` is stable, so that stays the
    /// tiebreak. Unrated works go last when sorting by rating.
    func apply(to works: [Work]) -> [Work] {
        switch self {
        case .recent: works
        case .title: works.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .rating: works.sorted { ($0.rating ?? -1) > ($1.rating ?? -1) }
        case .progress: works.sorted { $0.progressFraction > $1.progressFraction }
        }
    }
}

#Preview {
    NavigationStack {
        LibraryListView(selectedTab: .constant(.library), onSearch: {})
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
            .environment(\.userStore, InMemoryUserStore.preview)
    }
}
