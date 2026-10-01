import SwiftUI

/// Fiche œuvre — pushed from anywhere (board `S06-Work`).
struct WorkDetailView: View {
    let work: Work
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss

    @State private var showProgressSheet = false
    @State private var showRating = false
    @State private var details: Work?
    @State private var unavailable = false
    @State private var synopsisExpanded = false
    @State private var similar: [Work] = []
    @State private var similarState: LoadState = .loading

    private enum LoadState { case loading, loaded, failed }

    private var owned: Work? { library.work(id: work.id) }
    /// Library copy wins (progress), enriched with fetched metadata when missing.
    private var current: Work {
        var base = owned ?? work
        if let details {
            if base.title.isEmpty { base.title = details.title; base.image = details.image; base.imageSmall = details.imageSmall }
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

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BKSpace.xl) {
                header
                if unavailable, owned != nil { unavailablePanel }
                if owned != nil { progressCard } else { addButton }
                synopsis
                similarSection
            }
            .padding(.bottom, BKSpace.xxxl)
            .background(alignment: .top) { hero }
        }
        .background(BKColor.background.ignoresSafeArea())
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let shareURL {
                ToolbarItem(placement: .primaryAction) {
                    ShareLink(item: shareURL) { Image(systemName: "square.and.arrow.up") }
                        .accessibilityLabel("Partager")
                }
            }
        }
        .task(id: work.id) { await load() }
        .sheet(isPresented: $showProgressSheet) {
            ProgressSheetView(work: current, showsDetailLink: false)
                .presentationDetents([.height(560), .large])
        }
        .sheet(isPresented: $showRating) {
            RatingSheetView(work: current, xpGained: GamificationCore.XPReward.completeWork)
                .presentationDetents([.height(340)])
        }
    }

    // MARK: - Sections

    /// Blurred, dotted cover fading into the background.
    private var hero: some View {
        ZStack {
            BKCover(url: current.image, showsBorder: false)
                .blur(radius: 16)
                .saturation(0.9)
                .opacity(0.85)
            LinearGradient(colors: [.clear, BKColor.background], startPoint: .center, endPoint: .bottom)
        }
        .frame(height: 330)
        .clipped()
        .padding(.top, -120)
        .accessibilityHidden(true)
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: 14) {
            BKCover(url: current.image)
                .frame(width: 120, height: 174)
                .bkPanelShadow(offset: 5)
            VStack(alignment: .leading, spacing: BKSpace.sm) {
                Text(current.title)
                    .font(BKFont.display(30))
                    .textCase(.uppercase)
                    .lineLimit(3)
                    .minimumScaleFactor(0.7)
                    .shadow(color: BKColor.background.opacity(0.6), radius: 0, x: 2, y: 2)
                Text(metaLine)
                    .font(.footnote)
                    .foregroundStyle(BKColor.textSecondary)
                if let owned { statusMenu(owned) }
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.lg)
    }

    private var metaLine: String {
        var first = [current.type == .anime ? "Anime" : "Manga"]
        if let year = current.year { first.append(String(year)) }
        if let total = current.total { first.append(current.type == .anime ? "\(total) ép." : "\(total) ch.") }
        let second = [current.format, current.genres.first].compactMap { $0 }
        return first.joined(separator: " · ") + (second.isEmpty ? "" : "\n" + second.joined(separator: " · "))
    }

    private func statusMenu(_ owned: Work) -> some View {
        Menu {
            ForEach(WorkStatus.allCases, id: \.self) { status in
                Button {
                    var updated = owned
                    updated.status = status
                    updated.lastUpdated = .now
                    library.upsert(updated)
                    HapticEngine.added()
                } label: {
                    Label(status.label, systemImage: status.iconName)
                }
            }
        } label: {
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

    /// États #9 — not in library yet: one clear add CTA.
    private var addButton: some View {
        BKPrimaryButton(title: "À voir", systemImage: "plus") {
            var added = current
            added.status = .planToRead
            added.dateAdded = .now
            added.lastUpdated = .now
            library.upsert(added)
            userStore.addXP(GamificationCore.XPReward.addWork)
            HapticEngine.added()
            toasts.show("\(current.title) → À voir") { [weak library] in library?.remove(id: work.id) }
        }
        .padding(.horizontal, BKSpace.screenMargin)
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
        }
        .padding(14)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow()
        .padding(.horizontal, BKSpace.screenMargin)
    }

    private func progressCaption(_ item: Work) -> String {
        let seen = item.lastUpdated.map { "Dernier vu " + $0.formatted(.relative(presentation: .named)) }
        return [seen, "touche le nombre pour sauter"].compactMap { $0 }.joined(separator: " · ")
    }

    @ViewBuilder
    private var synopsis: some View {
        if let text = current.synopsis, !text.isEmpty {
            VStack(alignment: .leading, spacing: BKSpace.sm) {
                Text("SYNOPSIS").font(BKFont.display(14, weight: .heavy)).tracking(1).foregroundStyle(BKColor.textSecondary)
                Text(text)
                    .font(.body)
                    .lineSpacing(3)
                    .lineLimit(synopsisExpanded ? nil : 4)
                if !synopsisExpanded {
                    Button("Plus") { synopsisExpanded = true }
                        .font(.body.weight(.bold))
                        .foregroundStyle(BKColor.accentText)
                }
            }
            .padding(.horizontal, BKSpace.screenMargin)
        }
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
        .padding(.horizontal, BKSpace.screenMargin)
    }

    @ViewBuilder
    private var similarSection: some View {
        if !(similarState == .loaded && similar.isEmpty) {
            VStack(alignment: .leading, spacing: 10) {
                Text("SIMILAIRES").font(BKFont.display(14, weight: .heavy)).tracking(1).foregroundStyle(BKColor.textSecondary)
                    .padding(.horizontal, BKSpace.screenMargin)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        switch similarState {
                        case .loading:
                            ForEach(0..<4, id: \.self) { _ in
                                Rectangle().fill(BKColor.surfaceTint).frame(width: 92, height: 132)
                            }
                        case .failed:
                            Text("Indisponible pour le moment").font(.caption).foregroundStyle(BKColor.textSecondary)
                        case .loaded:
                            ForEach(similar) { item in similarTile(item) }
                        }
                    }
                    .padding(.horizontal, BKSpace.screenMargin)
                }
            }
        }
    }

    private func similarTile(_ item: Work) -> some View {
        ZStack(alignment: .topTrailing) {
            NavigationLink(value: item) {
                BKCover(url: item.imageSmall ?? item.image).frame(width: 92, height: 132)
            }
            .accessibilityLabel(item.title)
            BKAddCornerButton(work: item)
        }
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

    private func load() async {
        similarState = .loading
        let type = work.type.tenrai
        do {
            details = try await TenraiClient.shared.details(id: work.id, type: type).data.asWork(mediaType: type)
        } catch TenraiClient.ClientError.badStatus(404) {
            unavailable = true
        } catch {}
        do {
            let response = try await TenraiClient.shared.recommendations(id: work.id, type: type)
            similar = response.data.prefix(10).map { $0.entry.asWork(mediaType: type) }
            similarState = .loaded
        } catch {
            similarState = .failed
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
