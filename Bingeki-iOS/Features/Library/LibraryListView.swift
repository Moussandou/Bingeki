import SwiftUI

/// Bibliothèque — status chips + rows, `+1` on the row for the dominant
/// case, tap opens the progress sheet for jumps (board `S07-Library`).
struct LibraryListView: View {
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @State private var filter: WorkStatus = .reading
    @State private var sheetWork: Work?

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: BKSpace.sm) {
                    ForEach(WorkStatus.allCases, id: \.self) { status in
                        Button {
                            filter = status
                        } label: {
                            BKStatusChip(status: status, isSelected: filter == status)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, BKSpace.screenMargin)
            }
            .padding(.vertical, BKSpace.sm)

            let filtered = library.works(status: filter)
            if filtered.isEmpty {
                ContentUnavailableView(
                    "Rien ici",
                    systemImage: "books.vertical",
                    description: Text("Ajoute des titres depuis Découvrir ou la recherche.")
                )
            } else {
                List(filtered) { work in
                    Button { sheetWork = work } label: {
                        LibraryRow(work: work) {
                            var updated = work
                            updated.incrementProgress(by: 1)
                            library.upsert(updated)
                            userStore.addXP(GamificationCore.XPReward.updateProgress)
                            HapticEngine.progressTick()
                        }
                    }
                    .buttonStyle(.plain)
                    .listRowInsets(EdgeInsets(top: 8, leading: BKSpace.screenMargin, bottom: 8, trailing: BKSpace.screenMargin))
                }
                .listStyle(.plain)
            }
        }
        .background(BKColor.background)
        .navigationTitle("Biblio")
        .sheet(item: $sheetWork) { work in
            ProgressSheetView(work: work)
                .presentationDetents([.medium, .large])
        }
    }
}

private struct LibraryRow: View {
    let work: Work
    let onIncrement: () -> Void

    var body: some View {
        HStack(spacing: BKSpace.md) {
            BKCover(url: work.image).frame(width: 48, height: 68)
            VStack(alignment: .leading, spacing: 5) {
                Text(work.title).font(.subheadline.weight(.bold)).lineLimit(1)
                Text(work.type == .anime ? "Ép. \(work.progress)" : "Ch. \(work.progress)")
                    .font(.caption).foregroundStyle(BKColor.textSecondary)
                ProgressView(value: work.progressFraction).tint(BKColor.brandPink)
            }
            Spacer()
            if work.status == .reading {
                Button("+1", action: onIncrement)
                    .font(BKFont.display(15))
                    .frame(width: 52, height: 44)
                    .foregroundStyle(BKColor.brandPink)
                    .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.brandPink, lineWidth: 2))
            }
        }
    }
}

#Preview {
    NavigationStack {
        LibraryListView()
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
            .environment(\.userStore, InMemoryUserStore.preview)
    }
}
