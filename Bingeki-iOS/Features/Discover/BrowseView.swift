import SwiftUI

/// Parcourir — intentional browsing: collections, genres, community top (board `S04-Browse`).
struct BrowseView: View {
    let onSearch: () -> Void

    @Environment(\.userStore) private var userStore
    @State private var seasonal: [Work] = []
    @State private var top: [Work] = []
    @State private var failed = false
    @State private var isLoading = false
    @State private var loaded = false
    @State private var generation = UUID()

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
                            if top.isEmpty && isLoading {
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
                if loaded && top.isEmpty && !failed {
                    Text("Aucun titre disponible.").foregroundStyle(BKColor.textSecondary)
                        .padding(.horizontal, BKSpace.screenMargin)
                }

                if failed {
                    Button("Une source ne répond pas. Réessayer") { Task { await load() } }
                        .font(.footnote)
                        .foregroundStyle(BKColor.textSecondary)
                        .padding(.horizontal, BKSpace.screenMargin)
                        .disabled(isLoading)
                }
            }
            .padding(.top, BKSpace.md)
            .padding(.bottom, BKSpace.xl)
        }
        .refreshable { await load() }
        .task(id: userStore.profile.nsfwMode) {
            generation = UUID()
            seasonal = []
            top = []
            isLoading = false
            await load()
        }
        .navigationDestination(for: BrowseFeed.self) { BrowseGridView(feed: $0) }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: BKSpace.md) {
            Text(title).font(BKFont.title3).bkLabelStyle().padding(.horizontal, BKSpace.screenMargin)
            content()
        }
    }

    private func load() async {
        guard !isLoading else { return }
        isLoading = true
        failed = false
        let token = generation
        defer { if generation == token { isLoading = false } }
        let sfw = !userStore.profile.nsfwMode
        do {
            let items = try await BrowseFeed.season.load(sfw: sfw)
            guard generation == token, !Task.isCancelled else { return }
            seasonal = items
        } catch {
            guard generation == token, !Task.isCancelled else { return }
            failed = true
        }
        do {
            let items = try await BrowseFeed.top.load(sfw: sfw)
            guard generation == token, !Task.isCancelled else { return }
            top = Array(items.prefix(10))
        } catch {
            guard generation == token, !Task.isCancelled else { return }
            failed = true
        }
        loaded = true
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
        try await load(page: 1, sfw: sfw).works
    }

    /// One page of the feed and whether a next page exists.
    func load(page: Int, sfw: Bool) async throws -> (works: [Work], hasMore: Bool) {
        let client = TenraiClient.shared
        switch self {
        case .season:
            let response = try await client.topSeasonalAnime(limit: 24, page: page, sfw: sfw)
            return (response.data.map { $0.asWork(mediaType: .anime) }, response.pagination?.hasNextPage ?? false)
        case .top:
            let response = try await client.top(type: .anime, limit: 24, page: page, sfw: sfw)
            return (response.data.map { $0.asWork(mediaType: .anime) }, response.pagination?.hasNextPage ?? false)
        case .short:
            async let season = client.topSeasonalAnime(limit: 24, page: page, sfw: sfw)
            async let top = client.top(type: .anime, limit: 24, page: page, sfw: sfw)
            let (s, t) = try await (season, top)
            let works = (s.data + t.data).map { $0.asWork(mediaType: .anime) }
                .filter { ($0.totalEpisodes ?? 99) <= 13 }.uniqued()
            return (works, (s.pagination?.hasNextPage ?? false) || (t.pagination?.hasNextPage ?? false))
        case .genre(let id, _):
            let response = try await client.byGenre(id, type: .anime, page: page, sfw: sfw)
            return (response.data.map { $0.asWork(mediaType: .anime) }, response.pagination?.hasNextPage ?? false)
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
    @State private var pager: CatalogPager<BrowseFeed>

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)

    init(feed: BrowseFeed) {
        self.feed = feed
        let sources: [BrowseFeed] = feed == .short ? [.season, .top] : [feed]
        _pager = State(initialValue: CatalogPager(sources: sources) { source, page, sfw in
            let response = try await source.load(page: page, sfw: sfw)
            let works = feed == .short ? response.works.filter { ($0.totalEpisodes ?? 99) <= 13 } : response.works
            return CatalogPage(works: works, hasMore: response.hasMore)
        })
    }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                if pager.isLoading && pager.works.isEmpty {
                    ForEach(0..<12, id: \.self) { _ in
                        Rectangle().fill(BKColor.surfaceTint).aspectRatio(0.7, contentMode: .fit)
                    }
                }
                ForEach(pager.works) { work in
                    ZStack(alignment: .topTrailing) {
                        NavigationLink(value: work) {
                            BKCover(url: work.imageSmall ?? work.image).aspectRatio(0.7, contentMode: .fit)
                        }
                        .accessibilityLabel(work.title)
                        BKAddCornerButton(work: work, size: 28)
                    }
                    .onAppear { if work.id == pager.works.last?.id { loadMore() } }
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.vertical, BKSpace.md)

            if pager.isLoading {
                ProgressView().frame(maxWidth: .infinity, minHeight: 56)
            }

            if !pager.failures.isEmpty {
                VStack(spacing: BKSpace.md) {
                    Text("Source indisponible : \(pager.failures.map(\.title).sorted().joined(separator: ", ")).")
                        .foregroundStyle(BKColor.textSecondary)
                    BKOutlineButton(title: "Réessayer", systemImage: "arrow.clockwise") { loadMore(retry: true) }
                        .frame(width: 220)
                        .disabled(pager.isLoading)
                }
            }
            if pager.hasLoaded && pager.works.isEmpty && !pager.isLoading {
                Text(pager.hasMore ? "Aucun titre éligible sur ces pages." : "Aucun titre dans cette collection.")
                    .foregroundStyle(BKColor.textSecondary).padding()
            }
            if pager.canLoadMore && !pager.isLoading {
                Button("Charger la suite") { loadMore() }.padding()
            }
        }
        .background(BKColor.background.ignoresSafeArea())
        .bkNavigationHeader(feed.title)
        .task(id: userStore.profile.nsfwMode) {
            pager.reset()
            await pager.load(sfw: !userStore.profile.nsfwMode, emptyPageLimit: 3)
        }
    }

    /// Next page when the last cover scrolls into view.
    private func loadMore(retry: Bool = false) {
        Task {
            await pager.load(sfw: !userStore.profile.nsfwMode, retry: retry, emptyPageLimit: 3)
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
