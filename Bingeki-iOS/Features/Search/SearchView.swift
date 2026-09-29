import SwiftUI

/// Recherche — the app's one universal add point (board `S05-Search`).
/// A single "+" component pattern: tap adds at the default status, and a
/// toast with "Annuler" always follows — per the Ajout exploration's
/// direction (A + B combined).
struct SearchView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.libraryStore) private var library
    @Environment(ToastCenter.self) private var toasts

    @State private var query = ""
    @State private var results: [Work] = []
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            List {
                if query.count < 2 {
                    Section("ESSAIE") {
                        ForEach(["chainsaw man", "kaiju", "frieren", "berserk"], id: \.self) { hint in
                            Button(hint) { query = hint }
                        }
                    }
                } else if results.isEmpty {
                    ContentUnavailableView("Rien pour « \(query) »", systemImage: "magnifyingglass")
                } else {
                    ForEach(results) { work in
                        HStack(spacing: BKSpace.md) {
                            NavigationLink(value: work) {
                                BKCover(url: work.image).frame(width: 50, height: 72)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(work.title).font(.subheadline.weight(.bold))
                                Text(work.type == .anime ? "Anime" : "Manga").font(.caption).foregroundStyle(BKColor.textSecondary)
                            }
                            Spacer()
                            addButton(for: work)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .searchable(text: $query, prompt: "Anime, manga…")
            .navigationDestination(for: Work.self) { WorkDetailView(work: $0) }
            .navigationTitle("Rechercher")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .onChange(of: query) { _, newValue in scheduleSearch(newValue) }
        }
    }

    private func addButton(for work: Work) -> some View {
        let inLibrary = library.work(id: work.id) != nil
        return Button {
            var added = work
            added.status = .planToRead
            library.upsert(added)
            toasts.show("\(work.title) → À voir") { [weak library] in library?.remove(id: work.id) }
            HapticEngine.added()
        } label: {
            Image(systemName: inLibrary ? "checkmark" : "plus")
                .font(.subheadline.weight(.bold))
                .frame(width: 44, height: 44)
                .foregroundStyle(inLibrary ? BKColor.greenText : BKColor.brandPink)
                .background(inLibrary ? BKColor.greenText.opacity(0.12) : .clear)
                .overlay(RoundedRectangle(cornerRadius: 0).stroke(inLibrary ? BKColor.greenText : BKColor.brandPink, lineWidth: 2))
        }
        .accessibilityLabel(inLibrary ? "Déjà ajouté" : "Ajouter \(work.title)")
    }

    private func scheduleSearch(_ text: String) {
        searchTask?.cancel()
        guard text.count >= 2 else { results = []; return }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await performSearch(text)
        }
    }

    private func performSearch(_ text: String) async {
        async let animeResult = try? TenraiClient.shared.search(query: text, type: .anime, limit: 10)
        async let mangaResult = try? TenraiClient.shared.search(query: text, type: .manga, limit: 10)
        let anime = (await animeResult)?.data.map { $0.asWork(mediaType: .anime) } ?? []
        let manga = (await mangaResult)?.data.map { $0.asWork(mediaType: .manga) } ?? []
        guard !Task.isCancelled else { return }
        results = anime + manga
    }
}

#Preview {
    SearchView()
        .environment(\.libraryStore, InMemoryLibraryStore.preview)
        .environment(ToastCenter())
}
