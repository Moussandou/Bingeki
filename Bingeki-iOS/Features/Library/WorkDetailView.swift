import SwiftUI

/// Fiche œuvre — the one screen pushed from anywhere, board `S06-Work`.
struct WorkDetailView: View {
    let work: Work
    @Environment(InMemoryLibraryStore.self) private var library
    @Environment(InMemoryUserStore.self) private var userStore
    @State private var showProgressSheet = false

    private var current: Work { library.work(id: work.id) ?? work }
    private var inLibrary: Bool { library.work(id: work.id) != nil }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BKSpace.xl) {
                header
                if inLibrary { progressCard }
                if let synopsis = current.synopsis, !synopsis.isEmpty {
                    VStack(alignment: .leading, spacing: BKSpace.sm) {
                        Text("SYNOPSIS").font(BKFont.caption).foregroundStyle(BKColor.textSecondary)
                        Text(synopsis).font(.subheadline).lineLimit(6)
                    }
                    .padding(.horizontal, BKSpace.screenMargin)
                }
            }
            .padding(.bottom, BKSpace.xxxl)
        }
        .background(BKColor.background)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showProgressSheet) {
            ProgressSheetView(work: current).presentationDetents([.medium, .large])
        }
        .toolbar {
            if !inLibrary {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        var added = work
                        added.status = .planToRead
                        library.upsert(added)
                        userStore.addXP(GamificationCore.XPReward.addWork)
                        HapticEngine.added()
                    } label: {
                        Label("Ajouter", systemImage: "plus")
                    }
                }
            }
        }
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: BKSpace.md) {
            BKCover(url: work.image).frame(width: 120, height: 174)
            VStack(alignment: .leading, spacing: BKSpace.sm) {
                Text(work.title).font(BKFont.title1).lineLimit(2)
                Text([work.type == .anime ? "Anime" : "Manga", work.year.map(String.init), work.genres.first].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption).foregroundStyle(BKColor.textSecondary)
                if inLibrary {
                    BKStatusChip(status: current.status, isSelected: true)
                }
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.md)
    }

    private var progressCard: some View {
        Button { showProgressSheet = true } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .lastTextBaseline, spacing: 6) {
                        Text("\(current.progress)").font(BKFont.display(56))
                        Text(current.type == .anime ? "ép." : "ch.").font(.subheadline.weight(.semibold))
                    }
                    Text("Touche pour modifier").font(.caption).foregroundStyle(BKColor.textSecondary)
                }
                Spacer()
                Text("+1")
                    .font(BKFont.display(20))
                    .frame(width: 92, height: 60)
                    .foregroundStyle(.white)
                    .background(BKColor.ctaFill)
                    .clipShape(BKChamferedShape(cut: 8))
            }
            .padding(BKSpace.md)
            .background(BKColor.surface)
            .bkInkBorder()
        }
        .buttonStyle(.plain)
        .foregroundStyle(BKColor.textPrimary)
        .padding(.horizontal, BKSpace.screenMargin)
    }
}

#Preview {
    NavigationStack {
        WorkDetailView(work: .sampleFrieren)
            .environment(InMemoryLibraryStore.preview)
            .environment(InMemoryUserStore.preview)
    }
}
