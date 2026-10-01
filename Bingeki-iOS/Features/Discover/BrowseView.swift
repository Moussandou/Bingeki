import SwiftUI

/// Parcourir — intentional browsing: collections, genres, community top (board `S04-Browse`).
struct BrowseView: View {
    let onSearch: () -> Void

    @Environment(\.userStore) private var userStore
    @State private var seasonal: [Work] = []
    @State private var top: [Work] = []
    @State private var failed = false

    private var short: [Work] { (seasonal + top).filter { ($0.totalEpisodes ?? 99) <= 13 }.uniqued() }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BKSpace.xl) {
                Button(action: onSearch) {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass").font(.body.weight(.bold))
                        Text("Titre, auteur, studio…")
                        Spacer()
                    }
                    .font(.body)
                    .foregroundStyle(BKColor.textSecondary)
                    .padding(.horizontal, 14)
                    .frame(height: 48)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, BKSpace.screenMargin)

                section("Collections") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: BKSpace.md) {
                            NavigationLink(value: BrowseFeed.season) {
                                CollectionCard(title: BrowseFeed.season.title, caption: "En diffusion maintenant", covers: seasonal, shadow: BKColor.brandPink)
                            }
                            NavigationLink(value: BrowseFeed.short) {
                                CollectionCard(title: BrowseFeed.short.title, caption: "13 épisodes max", covers: short, shadow: BKColor.brandCyan)
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, BKSpace.screenMargin)
                        .padding(.bottom, 4)
                    }
                }

                section("Genres") {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                        ForEach(BrowseFeed.genres, id: \.self) { feed in
                            NavigationLink(value: feed) { GenreTile(title: feed.title, color: feed.color) }
                        }
                        NavigationLink(value: BrowseFeed.top) { GenreTile(title: "Tout voir ›", color: .white) }
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, BKSpace.screenMargin)
                }

                section("Top communauté") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            if top.isEmpty {
                                ForEach(0..<4, id: \.self) { _ in
                                    Rectangle().fill(BKColor.surfaceTint).frame(width: 96, height: 138)
                                }
                            }
                            ForEach(top) { work in
                                ZStack(alignment: .topTrailing) {
                                    NavigationLink(value: work) {
                                        BKCover(url: work.imageSmall ?? work.image).frame(width: 96, height: 138)
                                    }
                                    .accessibilityLabel(work.title)
                                    BKAddCornerButton(work: work)
                                }
                            }
                        }
                        .padding(.horizontal, BKSpace.screenMargin)
                    }
                }

                if failed {
                    Text("Le catalogue ne répond pas. Tire pour réessayer.")
                        .font(.footnote)
                        .foregroundStyle(BKColor.textSecondary)
                        .padding(.horizontal, BKSpace.screenMargin)
                }
            }
            .padding(.top, BKSpace.md)
            .padding(.bottom, BKSpace.xl)
        }
        .refreshable { await load() }
        .task { if seasonal.isEmpty { await load() } }
        .navigationDestination(for: BrowseFeed.self) { BrowseGridView(feed: $0) }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: BKSpace.md) {
            Text(title).font(BKFont.title3).bkLabelStyle().padding(.horizontal, BKSpace.screenMargin)
            content()
        }
    }

    private func load() async {
        let sfw = !userStore.profile.nsfwMode
        async let s = try? BrowseFeed.season.load(sfw: sfw)
        async let t = try? BrowseFeed.top.load(sfw: sfw)
        seasonal = await s ?? seasonal
        top = Array((await t ?? top).prefix(10))
        failed = seasonal.isEmpty && top.isEmpty
    }
}

/// A browsable list: season, short series, a genre, or the overall top.
enum BrowseFeed: Hashable {
    case season, short, top
    case genre(id: Int, name: String)

    static let genres: [BrowseFeed] = [
        .genre(id: 27, name: "Shōnen"), .genre(id: 42, name: "Seinen"), .genre(id: 62, name: "Isekai"),
        .genre(id: 30, name: "Sport"), .genre(id: 22, name: "Romance"),
    ]

    var title: String {
        switch self {
        case .season: return Self.currentSeasonName
        case .short: return "Courts & intenses"
        case .top: return "Top communauté"
        case .genre(_, let name): return name
        }
    }

    var color: Color {
        switch self {
        case .genre(27, _): return BKColor.brandPink
        case .genre(42, _): return BKColor.brandCyan
        case .genre(62, _): return BKColor.warningFill
        case .genre(30, _): return Color(red: 0.063, green: 0.725, blue: 0.506)
        case .genre(22, _): return Color(red: 0.769, green: 0.71, blue: 0.992)
        default: return .white
        }
    }

    func load(sfw: Bool) async throws -> [Work] {
        let client = TenraiClient.shared
        switch self {
        case .season:
            return try await client.topSeasonalAnime(limit: 24, sfw: sfw).data.map { $0.asWork(mediaType: .anime) }
        case .top:
            return try await client.top(type: .anime, limit: 24, sfw: sfw).data.map { $0.asWork(mediaType: .anime) }
        case .short:
            async let season = client.topSeasonalAnime(limit: 24, sfw: sfw)
            async let top = client.top(type: .anime, limit: 24, sfw: sfw)
            let all = try await season.data + top.data
            return all.map { $0.asWork(mediaType: .anime) }.filter { ($0.totalEpisodes ?? 99) <= 13 }.uniqued()
        case .genre(let id, _):
            return try await client.byGenre(id, type: .anime, sfw: sfw).data.map { $0.asWork(mediaType: .anime) }
        }
    }

    static var currentSeasonName: String {
        let date = Date.now
        let month = Calendar.current.component(.month, from: date)
        let year = Calendar.current.component(.year, from: date)
        let season = ["Hiver", "Printemps", "Été", "Automne"][(month - 1) / 3]
        return "\(season) \(year)"
    }
}

/// Dense 3-column grid behind a collection or genre.
struct BrowseGridView: View {
    let feed: BrowseFeed
    @Environment(\.userStore) private var userStore
    @State private var works: [Work] = []
    @State private var state: Phase = .loading

    private enum Phase { case loading, loaded, failed }
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                if state == .loading {
                    ForEach(0..<12, id: \.self) { _ in
                        Rectangle().fill(BKColor.surfaceTint).aspectRatio(0.7, contentMode: .fit)
                    }
                }
                ForEach(works) { work in
                    ZStack(alignment: .topTrailing) {
                        NavigationLink(value: work) {
                            BKCover(url: work.imageSmall ?? work.image).aspectRatio(0.7, contentMode: .fit)
                        }
                        .accessibilityLabel(work.title)
                        BKAddCornerButton(work: work, size: 28)
                    }
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.vertical, BKSpace.md)

            if state == .failed {
                VStack(spacing: BKSpace.md) {
                    Text("Le catalogue ne répond pas.").foregroundStyle(BKColor.textSecondary)
                    BKOutlineButton(title: "Réessayer", systemImage: "arrow.clockwise") { Task { await load() } }
                        .frame(width: 220)
                }
            }
        }
        .background(BKColor.background.ignoresSafeArea())
        .navigationTitle(feed.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { if works.isEmpty { await load() } }
    }

    private func load() async {
        state = .loading
        do {
            works = try await feed.load(sfw: !userStore.profile.nsfwMode)
            state = .loaded
        } catch {
            state = .failed
        }
    }
}

private struct CollectionCard: View {
    let title: String
    let caption: String
    let covers: [Work]
    let shadow: Color

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            ZStack {
                if covers.count > 1 {
                    BKCover(url: covers[1].imageSmall ?? covers[1].image)
                        .frame(width: 64, height: 92)
                        .rotationEffect(.degrees(-4))
                        .offset(x: 54, y: -12)
                }
                if let first = covers.first {
                    BKCover(url: first.imageSmall ?? first.image)
                        .frame(width: 64, height: 92)
                        .rotationEffect(.degrees(8))
                        .offset(x: 100, y: -4)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(BKFont.display(20)).textCase(.uppercase).lineLimit(2)
                Text(caption).font(.caption).foregroundStyle(BKColor.textSecondary)
            }
            .frame(maxWidth: 130, alignment: .leading)
            .padding(BKSpace.md)
        }
        .frame(width: 250, height: 132)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .clipped()
        .bkInkBorder()
        .bkPanelShadow(shadow)
    }
}

private struct GenreTile: View {
    let title: String
    let color: Color

    var body: some View {
        Text(title)
            .font(BKFont.display(17))
            .textCase(.uppercase)
            .foregroundStyle(.black)
            .padding(.horizontal, BKSpace.md)
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            .background(color)
            .bkInkBorder()
            .bkPanelShadow(offset: 3)
    }
}

extension Array where Element == Work {
    /// Drops repeated ids, keeping the first occurrence.
    func uniqued() -> [Work] {
        var seen = Set<String>()
        return filter { seen.insert($0.id).inserted }
    }
}
