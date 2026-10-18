import SwiftUI

/// Fiche œuvre — pushed from anywhere (board `S06-Work`), laid out like the
/// web fiche: cover and tabs, title and score, then the selected tab.
struct WorkDetailView: View {
    let work: Work
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss

    @State private var showProgressSheet = false
    @State private var showRating = false
    @State private var details: Work?
    @State private var extras: TenraiFullExtras?
    @State private var unavailable = false
    @State private var frenchSynopsis: String?
    @State private var tab: WorkTab = .general
    @State private var cast: [TenraiCharacterRole] = []
    @State private var episodes: [TenraiEpisode] = []
    @State private var episodesPage = 1
    @State private var episodesHasMore = false
    @State private var similar: [(work: Work, votes: Int?)] = []
    @State private var stats: TenraiStatistics?
    @State private var staff: [TenraiStaff] = []
    @State private var reviews: [TenraiReview]?
    @State private var news: [TenraiNews]?
    @State private var pictures: [TenraiPicture]?

    private var owned: Work? { library.work(id: work.id) }
    /// Library copy wins (progress), enriched with fetched metadata when missing.
    private var current: Work {
        var base = owned ?? work
        if let details {
            if base.title.isEmpty { base.title = details.title; base.image = details.image; base.imageSmall = details.imageSmall }
            if base.image == nil { base.image = details.image }
            if base.synopsis == nil { base.synopsis = details.synopsis }
            if base.genres.isEmpty { base.genres = details.genres }
            if base.total == nil { base.totalEpisodes = details.totalEpisodes; base.totalChapters = details.totalChapters }
            if base.year == nil { base.year = details.year }
            if base.format == nil { base.format = details.format }
        }
        return base
    }

    private var shareURL: URL? {
        URL(string: "https://bingeki.web.app/fr/work/\(work.id)?type=\(work.type.rawValue)")
    }

    /// Same as the web "REGARDER": a search for the next episode/chapter.
    private var watchURL: URL? {
        let next = current.progress + 1
        let query = current.type == .anime ? "\(current.title) épisode \(next) vostfr" : "\(current.title) chapitre \(next) scan"
        var components = URLComponents(string: "https://www.google.com/search")
        components?.queryItems = [.init(name: "q", value: query)]
        return components?.url
    }

    var body: some View {
        ScrollView {
            VStack(spacing: BKSpace.lg) {
                WorkCoverHero(work: current)
                WorkTabBar(type: current.type, selection: $tab)
                VStack(spacing: BKSpace.md) {
                    Text(current.title.uppercased())
                        .font(BKFont.display(28))
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.7)
                        .foregroundStyle(BKColor.textPrimary)
                    WorkChips(work: current, score: extras?.score, hideScore: userStore.profile.hideScores)
                    WorkWatchRow(links: extras?.streaming ?? [], watchURL: current.type == .anime ? watchURL : nil)
                }
                .padding(.horizontal, BKSpace.screenMargin)

                Group {
                    if unavailable, owned != nil { unavailablePanel }
                    tabContent
                }
                .padding(.horizontal, BKSpace.screenMargin)
                .padding(.top, BKSpace.sm)
                .zIndex(1) // status menu floats over the recommendations

                WorkRecommendationsGrid(items: similar)
                    .padding(.horizontal, BKSpace.screenMargin)
                    .padding(.top, BKSpace.xl)
            }
            .padding(.bottom, BKSpace.xxxl)
        }
        .background(BKColor.background.ignoresSafeArea())
        .bkNavigationHeader {
            if let shareURL {
                ShareLink(item: shareURL) { BKHeaderIcon(systemName: "square.and.arrow.up") }
                    .accessibilityLabel("Partager")
            }
        }
        .task(id: work.id) { await load() }
        .task(id: tab) { await loadTab(tab) }
        .sheet(isPresented: $showProgressSheet) {
            ProgressSheetView(work: current, showsDetailLink: false)
                .presentationDetents([.height(640), .large])
        }
        .sheet(isPresented: $showRating) {
            RatingSheetView(work: current, xpGained: GamificationCore.XPReward.completeWork)
                .presentationDetents([.height(340)])
        }
    }

    // MARK: - Tabs

    @ViewBuilder
    private var tabContent: some View {
        switch tab {
        case .general: general
        case .episodes:
            WorkEpisodeList(type: current.type, episodes: episodes, totalChapters: current.totalChapters,
                            hasMore: episodesHasMore, progress: current.progress, canTrack: owned != nil,
                            onLoadMore: { Task { await loadMoreEpisodes() } }, onSelect: jump(to:))
        case .music:
            if let theme = extras?.theme { WorkMusicSection(theme: theme) } else { placeholder }
        case .reviews: WorkReviewsList(reviews: reviews)
        case .news: WorkNewsList(news: news)
        case .gallery: WorkGalleryGrid(pictures: pictures)
        case .stats:
            VStack(spacing: BKSpace.xl) {
                WorkStaffSection(staff: staff)
                if let stats { WorkStatsSection(stats: stats, type: current.type) } else { placeholder }
            }
        }
    }

    private var general: some View {
        VStack(alignment: .leading, spacing: BKSpace.xl) {
            if let text = frenchSynopsis ?? current.synopsis, !text.isEmpty { WorkSynopsisSection(text: text) }
            if let extras { WorkInfoPanel(work: current, extras: extras) }
            if let trailer = details?.trailerYouTubeId ?? current.trailerYouTubeId { WorkTrailerSection(youtubeId: trailer) }
            WorkCastSection(cast: cast)
            if let relations = extras?.relations { WorkFranchiseSection(relations: relations) }
            if let owned {
                VStack(alignment: .leading, spacing: BKSpace.md) {
                    WorkHeading(text: "Ma progression")
                    statusMenu(owned).zIndex(1)
                    progressCard
                }
                .zIndex(1)
            } else {
                WorkAddBox(onAdd: add)
            }
        }
    }

    private var placeholder: some View {
        ProgressView().frame(maxWidth: .infinity, minHeight: 120)
    }

    private func statusMenu(_ owned: Work) -> some View {
        BKMenu(items: WorkStatus.allCases.map { status in
            BKMenuItem(id: status.label, title: status.label, icon: status.iconName, isSelected: status == owned.status) {
                var updated = owned
                updated.status = status
                updated.lastUpdated = .now
                library.upsert(updated)
                HapticEngine.added()
            }
        }, alignment: .leading) {
            HStack(spacing: 6) {
                Image(systemName: owned.status.iconName)
                Text(owned.status.label.uppercased())
                Image(systemName: "chevron.down").font(.caption2.weight(.black))
            }
            .font(BKFont.display(14))
            .padding(.horizontal, 12)
            .frame(height: 40)
            .foregroundStyle(.black)
            .background(owned.status.color)
            .bkInkBorder()
        }
        .accessibilityLabel("Statut : \(owned.status.label), changer")
    }

    private var progressCard: some View {
        let item = current
        let unit = item.type == .anime ? "ép." : "ch."
        return VStack(alignment: .leading, spacing: BKSpace.md) {
            HStack {
                Button { showProgressSheet = true } label: {
                    HStack(alignment: .lastTextBaseline, spacing: 6) {
                        Text("\(item.progress)").font(BKFont.display(56))
                        Text(item.total.map { "/ \($0) \(unit)" } ?? unit)
                            .font(.body.weight(.semibold))
                            .foregroundStyle(BKColor.textSecondary)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(unit == "ép." ? "Épisode" : "Chapitre") \(item.progress), modifier")
                Spacer()
                if item.status != .completed {
                    Button { increment() } label: {
                        Text(item.type == .anime ? "+1 ÉP." : "+1 CH.")
                            .font(BKFont.display(20))
                            .frame(width: 128, height: 60)
                            .foregroundStyle(.white)
                            .background(BKColor.ctaFill)
                            .clipShape(BKChamferedShape(cut: 10))
                    }
                }
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Rectangle().fill(BKColor.surfaceTint)
                    Rectangle().fill(BKColor.brandPink).frame(width: proxy.size.width * item.progressFraction)
                }
            }
            .frame(height: 8)
            Text(progressCaption(item))
                .font(.caption)
                .foregroundStyle(BKColor.textSecondary)
            Divider().overlay(BKColor.surfaceTint)
            BKScorePicker(work: item)
        }
        .padding(14)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow()
    }

    private func progressCaption(_ item: Work) -> String {
        let seen = item.lastUpdated.map { "Dernier vu " + $0.formatted(.relative(presentation: .named)) }
        return [seen, "touche le nombre pour sauter"].compactMap { $0 }.joined(separator: " · ")
    }


    /// États #10 — gone at the source, user data kept.
    private var unavailablePanel: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            Text("Cette fiche n'existe plus à la source").font(.subheadline.weight(.bold))
            Text("Ta progression et ta note sont conservées. Elles restent dans tes stats.")
                .font(.footnote)
                .foregroundStyle(BKColor.textSecondary)
            HStack(spacing: BKSpace.md) {
                Button("Retirer de ma biblio") {
                    library.remove(id: work.id)
                    dismiss()
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(BKColor.accentText)
                .frame(minHeight: BKSize.minTapTarget)
            }
        }
        .padding(BKSpace.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(BKColor.surface)
        .bkInkBorder(BKColor.border)
    }

    // MARK: - Actions

    private func increment() {
        var updated = current
        let wasCompleted = updated.status == .completed
        updated.incrementProgress(by: 1)
        library.upsert(updated)
        userStore.addXP(GamificationCore.XPReward.updateProgress)
        HapticEngine.progressTick()
        if !wasCompleted, updated.status == .completed {
            userStore.addXP(GamificationCore.XPReward.completeWork)
            HapticEngine.success()
            showRating = true
        }
    }

    private func add() {
        var added = current
        added.status = .planToRead
        added.dateAdded = .now
        added.lastUpdated = .now
        library.upsert(added)
        userStore.addXP(GamificationCore.XPReward.addWork)
        HapticEngine.added()
        toasts.show("\(current.title) → À voir") { [weak library] in library?.remove(id: work.id) }
    }

    /// Episode list tap: place the progress on that episode.
    private func jump(to episode: Int) {
        guard owned != nil else { return }
        var updated = current
        let delta = episode - updated.progress
        guard delta != 0 else { return }
        let wasCompleted = updated.status == .completed
        updated.incrementProgress(by: delta)
        library.upsert(updated)
        HapticEngine.progressTick()
        toasts.show("\(current.title) → ép. \(episode)")
        if !wasCompleted, updated.status == .completed {
            userStore.addXP(GamificationCore.XPReward.completeWork)
            showRating = true
        }
    }

    private func loadMoreEpisodes() async {
        guard episodesHasMore, let page = try? await TenraiClient.shared.episodes(animeId: work.id, page: episodesPage + 1) else { return }
        episodes += page.data
        episodesPage += 1
        episodesHasMore = page.pagination?.hasNextPage ?? false
    }

    private func load() async {
        let type = work.type.tenrai
        do {
            let response = try await TenraiClient.shared.details(id: work.id, type: type)
            details = response.data.asWork(mediaType: type)
            extras = response.extras
        } catch TenraiClient.ClientError.badStatus(404) {
            unavailable = true
        } catch {}
        if let synopsis = details?.synopsis ?? work.synopsis {
            Task { frenchSynopsis = await SynopsisTranslation.french(for: synopsis, workId: work.id) }
        }
        // Spaced out a little: Tenrai allows ~3 requests per second.
        async let castCall = try? TenraiClient.shared.characters(id: work.id, type: type)
        async let recsCall = try? TenraiClient.shared.recommendations(id: work.id, type: type)
        let castResult = await castCall
        cast = (castResult?.data ?? []).sorted { ($0.role == "Main" ? 0 : 1) < ($1.role == "Main" ? 0 : 1) }
        similar = (await recsCall?.data ?? []).map { ($0.entry.asWork(mediaType: type), $0.votes) }
        if work.type == .anime, let page = try? await TenraiClient.shared.episodes(animeId: work.id) {
            episodes = page.data
            episodesPage = 1
            episodesHasMore = page.pagination?.hasNextPage ?? false
        }
    }

    /// Tab data is fetched the first time its tab opens, like the web.
    private func loadTab(_ tab: WorkTab) async {
        let type = work.type.tenrai
        switch tab {
        case .reviews where reviews == nil:
            reviews = (try? await TenraiClient.shared.reviews(id: work.id, type: type))?.data ?? []
        case .news where news == nil:
            news = (try? await TenraiClient.shared.news(id: work.id, type: type))?.data ?? []
        case .gallery where pictures == nil:
            pictures = (try? await TenraiClient.shared.pictures(id: work.id, type: type))?.data ?? []
        case .stats where stats == nil:
            async let statsCall = try? TenraiClient.shared.statistics(id: work.id, type: type)
            if work.type == .anime {
                // Key roles first (director, writer, music…), producers last, like the web's "Staff (principal)".
                let order = ["Director", "Series Composition", "Original Creator", "Music", "Character Design", "Sound Director", "Animation Director", "Script", "Producer"]
                func rank(_ member: TenraiStaff) -> Int {
                    member.positions.compactMap { position in order.firstIndex { position.hasPrefix($0) } }.min() ?? order.count
                }
                let fetched = (try? await TenraiClient.shared.staff(animeId: work.id))?.data ?? []
                staff = fetched.enumerated().sorted { (rank($0.element), $0.offset) < (rank($1.element), $1.offset) }.map(\.element)
            }
            stats = await statsCall?.data
        default:
            break
        }
    }
}

#Preview {
    NavigationStack {
        WorkDetailView(work: .sampleFrieren)
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
            .environment(\.userStore, InMemoryUserStore.preview)
            .environment(ToastCenter())
    }
}
