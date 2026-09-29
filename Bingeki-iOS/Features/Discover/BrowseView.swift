import SwiftUI

/// Parcourir — dense grid for intentional search (genre, season), board
/// `S04-Browse`. Reads from Tenrai's seasonal endpoint.
struct BrowseView: View {
    @State private var seasonal: [Work] = []
    @State private var isLoading = true
    @Environment(\.libraryStore) private var library
    @Environment(ToastCenter.self) private var toasts

    private let columns = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(seasonal) { work in
                    ZStack(alignment: .topTrailing) {
                        NavigationLink(value: work) {
                            BKCover(url: work.image).aspectRatio(0.7, contentMode: .fit)
                        }
                        Button {
                            var added = work
                            added.status = .planToRead
                            library.upsert(added)
                            toasts.show("\(work.title) → À voir")
                            HapticEngine.added()
                        } label: {
                            Image(systemName: "plus")
                                .font(.subheadline.weight(.bold))
                                .frame(width: 28, height: 28)
                                .foregroundStyle(BKColor.brandPink)
                                .background(.black)
                                .overlay(Rectangle().stroke(BKColor.brandPink, lineWidth: 2))
                        }
                        .padding(4)
                    }
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.top, BKSpace.md)
            .redacted(reason: isLoading ? .placeholder : [])
        }
        .task { await loadSeasonal() }
    }

    private func loadSeasonal() async {
        do {
            let response = try await TenraiClient.shared.topSeasonalAnime(limit: 18)
            seasonal = response.data.map { $0.asWork(mediaType: .anime) }
        } catch {
            toasts.show("Le feed a buggé · réessaie")
        }
        isLoading = false
    }
}
