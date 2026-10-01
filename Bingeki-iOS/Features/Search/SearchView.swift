import SwiftUI

/// Recherche — the one universal add point (board `S05-Search`):
/// tap "+" adds as "À voir", a toast with "Annuler" always follows.
struct SearchView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(ToastCenter.self) private var toasts

    @State private var query = ""
    @State private var results: [Work] = []
    @State private var suggestion: Work?
    @State private var typeFilter: WorkType?
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @FocusState private var fieldFocused: Bool

    private var filtered: [Work] { results.filter { typeFilter == nil || $0.type == typeFilter } }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchBar
                if query.count >= 2 && !results.isEmpty { typePills }
                content
            }
            .background(BKColor.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Work.self) { WorkDetailView(work: $0) }
            .overlay { BKToastOverlay(bottomInset: BKSpace.lg) }
        }
        .onAppear {
            fieldFocused = true
            #if DEBUG
            if query.isEmpty, let debugQuery = UserDefaults.standard.string(forKey: "bk.searchQuery") { query = debugQuery }
            #endif
        }
        .onChange(of: query) { _, newValue in scheduleSearch(newValue) }
    }

    private var searchBar: some View {
        HStack(spacing: BKSpace.md) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.body.weight(.bold))
                    .foregroundStyle(BKColor.textSecondary)
                TextField("Anime, manga…", text: $query)
                    .font(.body)
                    .focused($fieldFocused)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .accessibilityLabel("Rechercher un anime ou un manga")
                    .accessibilityIdentifier("search_text_field")
                if !query.isEmpty {
                    Button { query = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(BKColor.textSecondary)
                    }
                    .accessibilityLabel("Effacer")
                }
            }
            .padding(.horizontal, BKSpace.md)
            .frame(height: 48)
            .background(BKColor.surface)
            .bkInkBorder(BKColor.brandPink)
            .bkPanelShadow(offset: 3)

            Button("Annuler") { dismiss() }
                .font(.body.weight(.semibold))
                .foregroundStyle(BKColor.accentText)
                .frame(minHeight: BKSize.minTapTarget)
                .accessibilityIdentifier("search_cancel_button")
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.lg)
        .padding(.bottom, BKSpace.md)
    }

    private var typePills: some View {
        HStack(spacing: BKSpace.sm) {
            pill("Tout · \(results.count)", nil)
            pill("Anime · \(results.filter { $0.type == .anime }.count)", .anime)
            pill("Manga · \(results.filter { $0.type == .manga }.count)", .manga)
            Spacer()
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.bottom, BKSpace.sm)
    }

    private func pill(_ label: String, _ type: WorkType?) -> some View {
        let isOn = typeFilter == type
        return Button {
            typeFilter = type
        } label: {
            Text(label)
                .font(.subheadline.weight(isOn ? .bold : .semibold))
                .padding(.horizontal, 14)
                .frame(height: 36)
                .foregroundStyle(isOn ? .black : BKColor.textPrimary)
                .background(isOn ? BKColor.brandPink : .clear)
                .overlay(Rectangle().stroke(isOn ? BKColor.ink : BKColor.border, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    @ViewBuilder
    private var content: some View {
        if query.count < 2 {
            hints
        } else if isSearching && results.isEmpty {
            skeletonRows
        } else if results.isEmpty {
            noResults
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(filtered) { work in SearchRow(work: work, onAdd: add) }
                }
            }
            .scrollDismissesKeyboard(.immediately)
        }
    }

    private var hints: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            Text("ESSAIE").font(BKFont.caption).foregroundStyle(BKColor.textSecondary)
            ForEach(["Chainsaw Man", "Kaiju No. 8", "Frieren", "Berserk"], id: \.self) { hint in
                Button {
                    query = hint
                } label: {
                    Label(hint, systemImage: "arrow.up.left")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(BKColor.textPrimary)
                        .frame(minHeight: BKSize.minTapTarget, alignment: .leading)
                }
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, BKSpace.screenMargin)
    }

    private var skeletonRows: some View {
        VStack(spacing: 0) {
            ForEach(0..<5, id: \.self) { _ in
                HStack(spacing: BKSpace.md) {
                    Rectangle().fill(BKColor.surfaceTint).frame(width: 50, height: 72)
                    VStack(alignment: .leading, spacing: 6) {
                        Rectangle().fill(BKColor.surfaceTint).frame(width: 170, height: 14)
                        Rectangle().fill(BKColor.surfaceTint).frame(width: 110, height: 10)
                    }
                    Spacer()
                }
                .padding(.horizontal, BKSpace.screenMargin)
                .frame(height: 92)
            }
            Spacer()
        }
        .accessibilityLabel("Recherche en cours")
    }

    /// États #5 — no result, fix in one tap.
    private var noResults: some View {
        VStack(alignment: .leading, spacing: BKSpace.lg) {
            Text("Rien pour « \(query) »").font(BKFont.title3)
            if let suggestion {
                VStack(alignment: .leading, spacing: BKSpace.sm) {
                    Text("Tu voulais dire :").font(.subheadline).foregroundStyle(BKColor.textSecondary)
                    SearchRow(work: suggestion, onAdd: add)
                        .background(BKColor.surface)
                        .bkInkBorder()
                }
            }
            Text("Astuce : le titre japonais ou anglais marche aussi (« Chensō Man »).")
                .font(.footnote)
                .foregroundStyle(BKColor.textSecondary)
            Spacer()
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.md)
    }

    private func add(_ work: Work) {
        var added = work
        added.status = .planToRead
        added.dateAdded = .now
        added.lastUpdated = .now
        library.upsert(added)
        userStore.addXP(GamificationCore.XPReward.addWork)
        HapticEngine.added()
        toasts.show("Ajouté · À voir") { [weak library] in library?.remove(id: work.id) }
    }

    private func scheduleSearch(_ text: String) {
        searchTask?.cancel()
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 2 else {
            results = []
            suggestion = nil
            isSearching = false
            return
        }
        isSearching = true
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            let sfw = !userStore.profile.nsfwMode
            let found = await Self.search(trimmed, sfw: sfw)
            guard !Task.isCancelled else { return }
            results = found
            suggestion = found.isEmpty ? await Self.suggest(for: trimmed, sfw: sfw) : nil
            guard !Task.isCancelled else { return }
            isSearching = false
        }
    }

    private static func search(_ text: String, sfw: Bool) async -> [Work] {
        async let anime = try? TenraiClient.shared.search(query: text, type: .anime, limit: 10, sfw: sfw)
        async let manga = try? TenraiClient.shared.search(query: text, type: .manga, limit: 10, sfw: sfw)
        let a = (await anime)?.data.map { $0.asWork(mediaType: .anime) } ?? []
        let m = (await manga)?.data.map { $0.asWork(mediaType: .manga) } ?? []
        // Interleave so both types show above the fold.
        var merged: [Work] = []
        for i in 0..<max(a.count, m.count) {
            if i < a.count { merged.append(a[i]) }
            if i < m.count { merged.append(m[i]) }
        }
        return merged
    }

    /// Typo recovery: retry with shorter prefixes ("chainsow" → "chains").
    private static func suggest(for text: String, sfw: Bool) async -> Work? {
        var prefix = text
        for _ in 0..<3 {
            prefix = String(prefix.dropLast())
            guard prefix.count >= 3, !Task.isCancelled else { return nil }
            if let hit = await search(prefix, sfw: sfw).first { return hit }
        }
        return nil
    }
}

private struct SearchRow: View {
    let work: Work
    let onAdd: (Work) -> Void
    @Environment(\.libraryStore) private var library

    var body: some View {
        let existing = library.work(id: work.id)
        HStack(spacing: BKSpace.md) {
            NavigationLink(value: work) {
                HStack(spacing: BKSpace.md) {
                    BKCover(url: work.imageSmall ?? work.image).frame(width: 50, height: 72)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(work.title).font(.body.weight(.bold)).lineLimit(2)
                        Text(meta).font(.caption).foregroundStyle(BKColor.textSecondary)
                        if let existing {
                            Label("DANS TA BIBLIO · \(existing.status.label.uppercased())", systemImage: "checkmark")
                                .font(BKFont.display(10, weight: .heavy))
                                .padding(.horizontal, 5).padding(.vertical, 2)
                                .foregroundStyle(.black)
                                .background(BKColor.greenText)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(BKColor.textPrimary)

            if existing != nil {
                NavigationLink(value: work) {
                    Image(systemName: "checkmark")
                        .font(.subheadline.weight(.black))
                        .frame(width: 44, height: 44)
                        .foregroundStyle(BKColor.greenText)
                        .background(BKColor.greenText.opacity(0.12))
                        .overlay(Rectangle().stroke(BKColor.greenText, lineWidth: 2))
                }
                .accessibilityLabel("Déjà ajouté, ouvrir la fiche")
            } else {
                Button { onAdd(work) } label: {
                    Image(systemName: "plus")
                        .font(.title3.weight(.black))
                        .frame(width: 44, height: 44)
                        .foregroundStyle(BKColor.accentText)
                        .overlay(Rectangle().stroke(BKColor.brandPink, lineWidth: 2))
                }
                .accessibilityLabel("Ajouter \(work.title)")
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.vertical, 10)
        .frame(minHeight: 92)
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
    }

    private var meta: String {
        var parts = [work.type == .anime ? (work.format ?? "Anime") : (work.format ?? "Manga")]
        if let year = work.year { parts.append(String(year)) }
        if let total = work.total { parts.append(work.type == .anime ? "\(total) ép." : "\(total) ch.") }
        return parts.joined(separator: " · ")
    }
}

#Preview {
    SearchView()
        .environment(\.libraryStore, InMemoryLibraryStore.preview)
        .environment(\.userStore, InMemoryUserStore.preview)
        .environment(ToastCenter())
}
