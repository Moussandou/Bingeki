import SwiftUI

/// Blocks of the work page, laid out like the web fiche (`WorkDetails.tsx`):
/// cover + tabs, then Général / épisodes / musiques / avis / actus / galerie /
/// statistiques, and "Vous aimerez aussi". Each block hides itself when its
/// data is missing.

enum WorkFormat {
    /// 3412345 → "3,4 M", 12500 → "12,5 k".
    static func compact(_ value: Int) -> String {
        let number = Double(value)
        let style = FloatingPointFormatStyle<Double>.number.precision(.fractionLength(0...1)).locale(Locale(identifier: "fr_FR"))
        if value >= 1_000_000 { return (number / 1_000_000).formatted(style) + " M" }
        if value >= 1_000 { return (number / 1_000).formatted(style) + " k" }
        return String(value)
    }

    static func score(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(2)).locale(Locale(identifier: "fr_FR")))
    }

    static func status(_ raw: String?) -> String? {
        switch raw {
        case "Finished Airing": return "Terminé"
        case "Currently Airing": return "En cours de diffusion"
        case "Not yet aired": return "Pas encore diffusé"
        case "Finished": return "Terminé"
        case "Publishing": return "En cours de publication"
        case "On Hiatus": return "En pause"
        case "Discontinued": return "Arrêté"
        case "Not yet published": return "Pas encore publié"
        default: return raw
        }
    }

    static func season(_ raw: String?, year: Int?) -> String? {
        let name: String? = switch raw {
        case "winter": "Hiver"
        case "spring": "Printemps"
        case "summer": "Été"
        case "fall": "Automne"
        default: nil
        }
        guard let name else { return nil }
        return [name, year.map(String.init)].compactMap { $0 }.joined(separator: " ")
    }

    static func duration(_ raw: String?) -> String? {
        guard let raw, raw != "Unknown" else { return nil }
        return raw.replacingOccurrences(of: " per ep", with: " par ép.")
            .replacingOccurrences(of: " hr", with: " h")
            .replacingOccurrences(of: " min", with: " min")
            .replacingOccurrences(of: " sec", with: " s")
    }

    static func rating(_ raw: String?) -> String? {
        guard let raw, !raw.isEmpty else { return nil }
        switch raw.components(separatedBy: " - ").first {
        case "G": return "Tous publics"
        case "PG": return "Enfants"
        case "PG-13": return "13 ans et +"
        case "R": return "17 ans et +"
        case "R+": return "17 ans et + (nudité légère)"
        case "Rx": return "Adultes"
        default: return raw.components(separatedBy: " (").first
        }
    }

    /// Jikan genre/theme names → French (unknown ones stay as they are).
    static func genre(_ raw: String) -> String {
        [
            "Action": "Action", "Adventure": "Aventure", "Avant Garde": "Avant-garde", "Award Winning": "Primé",
            "Comedy": "Comédie", "Drama": "Drame", "Fantasy": "Fantasy", "Gourmet": "Gastronomie", "Horror": "Horreur",
            "Mystery": "Mystère", "Romance": "Romance", "Sci-Fi": "Science-fiction", "Slice of Life": "Tranche de vie",
            "Sports": "Sport", "Supernatural": "Surnaturel", "Suspense": "Suspense", "School": "École",
            "Military": "Militaire", "Historical": "Historique", "Music": "Musique", "Psychological": "Psychologique",
            "Martial Arts": "Arts martiaux", "Super Power": "Super-pouvoirs", "Time Travel": "Voyage dans le temps",
            "Space": "Espace", "Mythology": "Mythologie", "Detective": "Détective", "Survival": "Survie",
            "Workplace": "Travail", "Adult Cast": "Personnages adultes", "Reincarnation": "Réincarnation",
            "Parody": "Parodie", "Love Polygon": "Triangle amoureux", "Strategy Game": "Jeu de stratégie",
            "Team Sports": "Sport d'équipe", "Combat Sports": "Sport de combat", "Racing": "Course",
            "Performing Arts": "Arts du spectacle", "Visual Arts": "Arts visuels", "Organized Crime": "Crime organisé",
            "Iyashikei": "Iyashikei", "Gag Humor": "Humour absurde", "Anthropomorphic": "Anthropomorphe",
            "Childcare": "Garde d'enfants", "Educational": "Éducatif", "Medical": "Médical", "Pets": "Animaux",
            "Video Game": "Jeu vidéo", "Otaku Culture": "Culture otaku", "Showbiz": "Showbiz", "Delinquents": "Délinquants",
            "Love Status Quo": "Romance tranquille", "High Stakes Game": "Jeu à haut risque", "Urban Fantasy": "Fantasy urbaine",
            "Villainess": "Méchante", "Magical Sex Shift": "Changement de sexe", "Reverse Harem": "Harem inversé",
        ][raw] ?? raw
    }

    static func source(_ raw: String?) -> String? {
        switch raw {
        case nil, "Unknown": return nil
        case "Original": return "Original"
        case "Light novel": return "Light novel"
        case "Novel": return "Roman"
        case "Web novel": return "Roman web"
        case "Game", "Video game": return "Jeu vidéo"
        case "Visual novel": return "Visual novel"
        case "4-koma manga": return "Yonkoma"
        case "Card game": return "Jeu de cartes"
        case "Book", "Picture book": return "Livre"
        case "Other": return "Autre"
        default: return raw
        }
    }

    static func relation(_ raw: String) -> String {
        switch raw {
        case "Prequel": return "Préquelle"
        case "Sequel": return "Suite"
        case "Side Story", "Side story": return "Histoire parallèle"
        case "Parent Story", "Parent story": return "Histoire principale"
        case "Full Story", "Full story": return "Histoire complète"
        case "Summary": return "Résumé"
        case "Alternative Version", "Alternative version": return "Version alternative"
        case "Alternative Setting", "Alternative setting": return "Univers alternatif"
        case "Adaptation": return "Adaptation"
        case "Spin-Off", "Spin-off": return "Spin-off"
        case "Character": return "Personnages communs"
        default: return "Autre"
        }
    }

    /// Jikan theme strings look like `1: "Again" by YUI (eps 1-14)`; keep the
    /// song and artist, drop the leading index and the episode range.
    static func song(_ raw: String) -> (title: String, detail: String?) {
        var text = raw
        if let range = text.range(of: #"^\d+:\s*"#, options: .regularExpression) { text.removeSubrange(range) }
        var detail: String?
        if let range = text.range(of: #"\s*\((eps?|ép)[^)]*\)\s*$"#, options: .regularExpression) {
            detail = String(text[range]).trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: "eps ", with: "ép. ").replacingOccurrences(of: "ep ", with: "ép. ")
            text.removeSubrange(range)
        }
        return (text.replacingOccurrences(of: "\"", with: ""), detail)
    }
}

// MARK: - Shared bits

/// Big Outfit heading, like the web's `SYNOPSIS` / `CASTING`.
struct WorkHeading: View {
    let text: String
    var icon: String?

    var body: some View {
        HStack(spacing: 8) {
            if let icon { Image(systemName: icon).font(.system(size: 18, weight: .bold)) }
            Text(text.uppercased()).font(BKFont.display(24))
        }
        .foregroundStyle(BKColor.textPrimary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityAddTraits(.isHeader)
    }
}

/// Dashed outline button ("VOIR PLUS", "AFFICHER PLUS").
struct WorkDashedButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(BKFont.display(15))
                .padding(.horizontal, 22).frame(height: 44)
                .foregroundStyle(BKColor.textPrimary)
                .overlay(Rectangle().stroke(BKColor.border, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}

/// Small "d/MM/yyyy" date from a Jikan ISO string, as the web shows it.
enum WorkDate {
    static func short(_ iso: String?) -> String? {
        guard let iso else { return nil }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime]
        let date = parser.date(from: iso) ?? {
            parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return parser.date(from: iso)
        }()
        guard let date else { return nil }
        return date.formatted(.dateTime.day(.twoDigits).month(.twoDigits).year().locale(Locale(identifier: "fr_FR")))
    }
}

// MARK: - Tabs

enum WorkTab: String, CaseIterable, Identifiable {
    case general, episodes, music, reviews, news, gallery, stats
    var id: Self { self }

    func title(for type: WorkType) -> String {
        switch self {
        case .general: "Général"
        case .episodes: type == .anime ? "Liste des épisodes" : "Liste des chapitres"
        case .music: "Musiques"
        case .reviews: "Avis"
        case .news: "Actus"
        case .gallery: "Galerie"
        case .stats: "Statistiques"
        }
    }

    static func available(for type: WorkType) -> [WorkTab] {
        type == .anime ? allCases : allCases.filter { $0 != .music }
    }
}

/// Web `WorkTabs`: plain uppercase labels, the selected one on a black block.
struct WorkTabBar: View {
    let type: WorkType
    @Binding var selection: WorkTab
    /// Hint arrows show while more tabs are hidden on that side.
    @State private var moreLeading = false
    @State private var moreTrailing = true

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(WorkTab.available(for: type)) { tab in
                        let on = tab == selection
                        Button {
                            withAnimation(.snappy(duration: 0.2)) { selection = tab }
                            HapticEngine.tabChanged()
                        } label: {
                            Text(tab.title(for: type).uppercased())
                                .font(BKFont.display(15))
                                .padding(.horizontal, 12).frame(height: 40)
                                .foregroundStyle(on ? .white : BKColor.textPrimary)
                                .background(on ? Color.black : .clear)
                        }
                        .buttonStyle(.plain)
                        .id(tab)
                        .accessibilityAddTraits(on ? [.isSelected, .isButton] : .isButton)
                    }
                }
                .padding(.horizontal, BKSpace.screenMargin)
            }
            .modifier(ScrollEdgeTracker(leading: $moreLeading, trailing: $moreTrailing))
            .onChange(of: selection) { _, tab in withAnimation { proxy.scrollTo(tab, anchor: .center) } }
        }
        .overlay(alignment: .leading) { if moreLeading { hint("chevron.left", leading: true) } }
        .overlay(alignment: .trailing) { if moreTrailing { hint("chevron.right", leading: false) } }
        .animation(.easeOut(duration: 0.2), value: moreLeading)
        .animation(.easeOut(duration: 0.2), value: moreTrailing)
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 2) }
    }

    /// Fade + arrow on the edge, so it's clear the tabs scroll sideways.
    private func hint(_ icon: String, leading: Bool) -> some View {
        HStack(spacing: 0) {
            if !leading {
                LinearGradient(colors: [BKColor.background.opacity(0), BKColor.background], startPoint: .leading, endPoint: .trailing)
                    .frame(width: 28)
            }
            Image(systemName: icon)
                .font(.system(size: 13, weight: .black))
                .foregroundStyle(BKColor.textPrimary)
                .frame(width: 26, height: 40)
                .background(BKColor.background)
            if leading {
                LinearGradient(colors: [BKColor.background, BKColor.background.opacity(0)], startPoint: .leading, endPoint: .trailing)
                    .frame(width: 28)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// Reports whether a horizontal scroll view has hidden content on each side.
private struct ScrollEdgeTracker: ViewModifier {
    @Binding var leading: Bool
    @Binding var trailing: Bool

    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.onScrollGeometryChange(for: [Bool].self) { geometry in
                let x = geometry.contentOffset.x + geometry.contentInsets.leading
                return [x > 4, x + geometry.containerSize.width < geometry.contentSize.width - 4]
            } action: { _, edges in
                leading = edges[0]
                trailing = edges[1]
            }
        } else {
            content
        }
    }
}

// MARK: - Header

/// Cover with the tilted "ANIME" label, as on the web fiche.
struct WorkCoverHero: View {
    let work: Work

    var body: some View {
        BKCover(url: work.image)
            .frame(width: 210, height: 300)
            .bkPanelShadow(offset: 6)
            .overlay(alignment: .topLeading) {
                Text(work.type == .anime ? "ANIME" : "MANGA")
                    .font(BKFont.display(18))
                    .padding(.horizontal, 10).padding(.vertical, 3)
                    .foregroundStyle(.white)
                    .background(Color.black)
                    .overlay(Rectangle().stroke(.white, lineWidth: 2))
                    .rotationEffect(.degrees(-6))
                    .offset(x: -14, y: 16)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, BKSpace.md)
    }
}

/// "Score: 9,25" and "28 Éps" chips under the title.
struct WorkChips: View {
    let work: Work
    let score: Double?
    let hideScore: Bool

    var body: some View {
        HStack(spacing: 10) {
            if !hideScore, let score { chip("trophy", "Score : \(WorkFormat.score(score))") }
            if let total = work.total { chip("book", work.type == .anime ? "\(total) Éps" : "\(total) Chap.") }
        }
        .frame(maxWidth: .infinity)
    }

    private func chip(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 15, weight: .semibold))
            Text(text).font(.subheadline.weight(.semibold))
        }
        .padding(.horizontal, 12).frame(height: 38)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .overlay(Rectangle().stroke(BKColor.textPrimary.opacity(0.15), lineWidth: 2))
    }
}

/// Streaming services as small brand squares, then "REGARDER".
struct WorkWatchRow: View {
    let links: [TenraiLink]
    let watchURL: URL?

    private static let brands: [String: (label: String, background: Color, foreground: Color)] = [
        "Crunchyroll": ("CR", Color(red: 0.96, green: 0.46, blue: 0.13), .white),
        "Netflix": ("N", Color(red: 0.86, green: 0.1, blue: 0.1), .white),
        "Bilibili Global": ("BILI", Color(red: 0, green: 0.63, blue: 0.84), .white),
        "Disney+": ("D+", Color(red: 0.07, green: 0.22, blue: 0.55), .white),
        "Prime Video": ("PRIME", Color(red: 0, green: 0.66, blue: 0.88), .white),
        "ADN": ("ADN", Color(red: 0.0, green: 0.6, blue: 0.85), .white),
    ]

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(links.filter { $0.url != nil }, id: \.name) { link in
                let brand = Self.brands[link.name]
                Link(destination: link.url!) {
                    Text(brand?.label ?? String(link.name.filter(\.isLetter).prefix(4)).uppercased())
                        .font(BKFont.display(14))
                        .padding(.horizontal, 10).frame(minWidth: 40).frame(height: 40)
                        .foregroundStyle(brand?.foreground ?? .white)
                        .background(brand?.background ?? .black)
                        .bkPanelShadow(BKColor.border.opacity(0.25), offset: 2)
                }
                .accessibilityLabel("Regarder sur \(link.name)")
            }
            if let watchURL {
                Link(destination: watchURL) {
                    HStack(spacing: 8) {
                        Image(systemName: "tv").font(.system(size: 16, weight: .semibold))
                        Text("REGARDER").font(BKFont.display(15))
                    }
                    .padding(.horizontal, 14).frame(height: 40)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder()
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

/// Wraps its children onto as many centred lines as needed.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = rows(for: subviews, width: proposal.width ?? .infinity)
        let height = rows.reduce(0) { $0 + $1.height } + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: proposal.width ?? rows.map(\.width).max() ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in rows(for: subviews, width: bounds.width) {
            var x = bounds.minX + (bounds.width - row.width) / 2
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: .unspecified)
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private func rows(for subviews: Subviews, width: CGFloat) -> [(indices: [Int], width: CGFloat, height: CGFloat)] {
        var rows: [(indices: [Int], width: CGFloat, height: CGFloat)] = []
        var current: [Int] = [], rowWidth: CGFloat = 0, rowHeight: CGFloat = 0
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            if !current.isEmpty, rowWidth + spacing + size.width > width {
                rows.append((current, rowWidth, rowHeight))
                current = []; rowWidth = 0; rowHeight = 0
            }
            rowWidth += (current.isEmpty ? 0 : spacing) + size.width
            rowHeight = max(rowHeight, size.height)
            current.append(index)
        }
        if !current.isEmpty { rows.append((current, rowWidth, rowHeight)) }
        return rows
    }
}

// MARK: - Synopsis

struct WorkSynopsisSection: View {
    let text: String
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WorkHeading(text: "Synopsis")
            Text(text)
                .font(.body)
                .lineSpacing(4)
                .lineLimit(expanded ? nil : 4)
                .foregroundStyle(BKColor.textPrimary)
            Button(expanded ? "Réduire" : "Lire la suite") { withAnimation { expanded.toggle() } }
                .font(.subheadline.weight(.bold))
                .underline()
                .foregroundStyle(BKColor.textPrimary)
        }
    }
}

// MARK: - Trailer

struct WorkTrailerSection: View {
    let youtubeId: String
    @State private var playing = false
    @State private var failed = false
    @Environment(\.openURL) private var openURL

    private var youtubeURL: URL? { URL(string: "https://www.youtube.com/watch?v=\(youtubeId)") }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "video").font(.system(size: 12, weight: .semibold))
                Text("BANDE-ANNONCE").font(.system(size: 12, weight: .bold))
            }
            .foregroundStyle(BKColor.textPrimary)
            ZStack {
                if playing && !failed {
                    TrailerPlayer(youtubeId: youtubeId, isPlaying: true, muted: false,
                                  onPlaying: {}, onStopped: {}, onFailure: { failed = true })
                } else {
                    // mqdefault is 16:9 (hqdefault carries black letterbox bars).
                    AsyncImage(url: URL(string: "https://img.youtube.com/vi/\(youtubeId)/mqdefault.jpg")) { phase in
                        if case .success(let image) = phase {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            BKColor.ink
                        }
                    }
                    Color.black.opacity(0.25)
                    Button {
                        if failed, let youtubeURL { openURL(youtubeURL) } else { playing = true }
                    } label: {
                        Image(systemName: "play.fill")
                            .font(.system(size: 26, weight: .black))
                            .foregroundStyle(.white)
                            .frame(width: 70, height: 70)
                            .background(Circle().fill(Color.black))
                            .overlay(Circle().stroke(.white, lineWidth: 3))
                    }
                    .accessibilityLabel("Lire la bande-annonce")
                }
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(16 / 9, contentMode: .fit)
            .clipped()
            .overlay(Rectangle().stroke(BKColor.surfaceTint, lineWidth: 2))
            .bkPanelShadow(offset: 6)

            if let youtubeURL {
                Link(destination: youtubeURL) {
                    HStack(spacing: 8) {
                        Image(systemName: "play.rectangle").font(.system(size: 15, weight: .semibold))
                        Text("VOIR SUR YOUTUBE").font(BKFont.display(14))
                        Image(systemName: "arrow.up.right.square").font(.system(size: 13, weight: .semibold))
                    }
                    .padding(.horizontal, 14).frame(height: 40)
                    .foregroundStyle(.white)
                    .background(Color(red: 0.91, green: 0.1, blue: 0.1))
                    .bkPanelShadow(offset: 4)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.top, 6)
            }
        }
    }
}

// MARK: - Casting

/// Round character portraits, role underneath, then the Japanese voice actor.
struct WorkCastSection: View {
    let cast: [TenraiCharacterRole]
    @State private var shown = 6

    var body: some View {
        if !cast.isEmpty {
            VStack(alignment: .leading, spacing: BKSpace.lg) {
                WorkHeading(text: "Casting")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3), spacing: 18) {
                    ForEach(cast.prefix(shown)) { item in cell(item) }
                }
                if cast.count > shown {
                    WorkDashedButton(title: "Voir plus") { withAnimation { shown += 9 } }
                }
            }
        }
    }

    private func cell(_ item: TenraiCharacterRole) -> some View {
        let voice = item.voiceActors?.first { $0.language == "Japanese" }?.person
        return VStack(spacing: 4) {
            portrait(item.character.images?.jpg.imageUrl, size: 96, line: 3)
            Text(item.character.name.components(separatedBy: ", ").reversed().joined(separator: " "))
                .font(.footnote.weight(.bold)).multilineTextAlignment(.center).lineLimit(2)
            Text(item.role == "Main" ? "Principal" : "Secondaire")
                .font(.caption2.weight(.medium)).foregroundStyle(BKColor.textSecondary)
            if let voice {
                Rectangle().fill(BKColor.surfaceTint).frame(height: 1).padding(.vertical, 4)
                portrait(voice.images?.jpg.imageUrl, size: 40, line: 2)
                Text(voice.name).font(.caption2.weight(.semibold))
                    .foregroundStyle(BKColor.textSecondary).multilineTextAlignment(.center).lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    private func portrait(_ url: URL?, size: CGFloat, line: CGFloat) -> some View {
        AsyncImage(url: url) { phase in
            if case .success(let image) = phase {
                image.resizable().aspectRatio(contentMode: .fill)
            } else {
                BKColor.surfaceTint
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(BKColor.border, lineWidth: line))
    }
}

// MARK: - Univers étendu

struct WorkFranchiseSection: View {
    let relations: [TenraiRelation]

    private var groups: [(label: String, entries: [TenraiRelationEntry])] {
        relations.compactMap { relation in
            let entries = relation.entry.filter { $0.type == "anime" || $0.type == "manga" }
            return entries.isEmpty ? nil : (WorkFormat.relation(relation.relation), entries)
        }
    }

    var body: some View {
        let groups = groups
        if !groups.isEmpty {
            VStack(alignment: .leading, spacing: BKSpace.lg) {
                Rectangle().fill(BKColor.surfaceTint).frame(height: 2)
                WorkHeading(text: "Univers étendu")
                ForEach(groups, id: \.label) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(group.label.uppercased())
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .foregroundStyle(.white)
                            .background(Color.black)
                        ForEach(group.entries) { entry in
                            NavigationLink(value: Work(id: String(entry.malId), title: entry.name,
                                                       type: entry.type == "anime" ? .anime : .manga, status: .planToRead)) {
                                HStack(alignment: .firstTextBaseline, spacing: 8) {
                                    Text("•").font(.subheadline.weight(.bold))
                                    Text("\(entry.name) (\(entry.type))")
                                        .font(.subheadline.weight(.semibold))
                                        .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder()
                    .bkPanelShadow()
                }
            }
        }
    }
}

// MARK: - Ajouter à ma liste

struct WorkAddBox: View {
    let onAdd: () -> Void

    var body: some View {
        VStack(spacing: BKSpace.md) {
            Text("AJOUTER À MA LISTE").font(BKFont.display(22))
            Text("Suis ta progression et reçois des notifications !")
                .font(.subheadline).multilineTextAlignment(.center)
            BKPrimaryButton(title: "Ajouter à ma collection", systemImage: "book", action: onAdd)
        }
        .foregroundStyle(BKColor.textPrimary)
        .padding(BKSpace.lg)
        .frame(maxWidth: .infinity)
        .background(BKColor.surfaceTint.opacity(0.6))
        .overlay(Rectangle().stroke(BKColor.border, style: StrokeStyle(lineWidth: 2, dash: [5, 4])))
    }
}

// MARK: - Episodes / chapters

struct WorkEpisodeList: View {
    let type: WorkType
    let episodes: [TenraiEpisode]
    let totalChapters: Int?
    let hasMore: Bool
    let progress: Int
    let canTrack: Bool
    let onLoadMore: () -> Void
    let onSelect: (Int) -> Void

    @State private var shownChapters = 50

    private var rows: [(number: Int, title: String, date: String?, filler: Bool)] {
        if type == .anime {
            return episodes.map { ($0.malId, $0.title ?? "Épisode \($0.malId)", WorkDate.short($0.aired), $0.filler == true) }
        }
        guard let totalChapters, totalChapters > 0 else { return [] }
        return (1...min(totalChapters, shownChapters)).map { ($0, "Chapitre \($0)", nil, false) }
    }

    private var canShowMore: Bool {
        type == .anime ? hasMore : (totalChapters ?? 0) > shownChapters
    }

    var body: some View {
        let rows = rows
        VStack(spacing: 12) {
            if rows.isEmpty {
                Text(type == .anime ? "Liste des épisodes indisponible pour le moment." : "Nombre de chapitres inconnu.")
                    .font(.subheadline).foregroundStyle(BKColor.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if canTrack, !rows.isEmpty {
                Text("Touche \(type == .anime ? "un épisode" : "un chapitre") pour y placer ta progression.")
                    .font(.caption).foregroundStyle(BKColor.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            ForEach(rows, id: \.number) { row in
                let seen = row.number <= progress
                Button { onSelect(row.number) } label: {
                    HStack(spacing: 14) {
                        Text("\(row.number)")
                            .font(BKFont.display(18))
                            .frame(width: 44, height: 44)
                            .foregroundStyle(.white)
                            .background(seen ? BKColor.ctaFill : BKColor.brandPink)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.title).font(.subheadline.weight(.bold)).lineLimit(2).multilineTextAlignment(.leading)
                            HStack(spacing: 6) {
                                if let date = row.date { Text(date).font(.caption).foregroundStyle(BKColor.textSecondary) }
                                if row.filler {
                                    Text("FILLER").font(BKFont.display(9, weight: .heavy))
                                        .padding(.horizontal, 5).padding(.vertical, 1)
                                        .foregroundStyle(.black).background(BKColor.warningFill)
                                }
                            }
                        }
                        Spacer(minLength: 0)
                        if seen {
                            Image(systemName: "checkmark.circle.fill").font(.title3).foregroundStyle(BKColor.accentText)
                        }
                    }
                    .padding(12)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder()
                    .bkPanelShadow()
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .allowsHitTesting(canTrack)
                .accessibilityLabel("\(row.title)\(seen ? ", vu" : "")")
            }
            if canShowMore {
                WorkDashedButton(title: "Afficher plus") {
                    if type == .anime { onLoadMore() } else { shownChapters += 50 }
                }
                .padding(.top, 4)
            }
        }
    }
}

// MARK: - Reviews

struct WorkReviewsList: View {
    let reviews: [TenraiReview]?

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            switch reviews {
            case nil:
                ProgressView().frame(maxWidth: .infinity, minHeight: 120)
            case let reviews? where reviews.isEmpty:
                emptyText("Aucun avis pour le moment.")
            case let reviews?:
                ForEach(reviews.prefix(10)) { ReviewCard(review: $0) }
            }
        }
    }
}

private struct ReviewCard: View {
    let review: TenraiReview
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                AsyncImage(url: review.user.images?.jpg.imageUrl) { phase in
                    if case .success(let image) = phase { image.resizable().aspectRatio(contentMode: .fill) } else { BKColor.surfaceTint }
                }
                .frame(width: 40, height: 40).clipShape(Circle()).overlay(Circle().stroke(BKColor.border, lineWidth: 2))
                VStack(alignment: .leading, spacing: 1) {
                    Text(review.user.username).font(.subheadline.weight(.bold))
                    if let date = WorkDate.short(review.date) { Text(date).font(.caption).foregroundStyle(BKColor.textSecondary) }
                }
                Spacer()
                if let score = review.score {
                    Text("\(score)/10").font(BKFont.display(16))
                        .padding(.horizontal, 10).frame(height: 32)
                        .foregroundStyle(.white).background(BKColor.ctaFill)
                }
            }
            if let tags = review.tags, !tags.isEmpty {
                HStack(spacing: 6) {
                    ForEach(tags, id: \.self) { tag in
                        Text(Self.tag(tag).uppercased()).font(.caption2.weight(.bold))
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .bkInkBorder(BKColor.border, width: 1.5)
                    }
                }
            }
            Text(review.review)
                .font(.subheadline).lineSpacing(3)
                .lineLimit(expanded ? nil : 6)
            HStack {
                Button(expanded ? "Réduire" : "Lire la suite") { withAnimation { expanded.toggle() } }
                    .font(.subheadline.weight(.bold)).underline()
                Spacer()
                if let url = review.url {
                    Link(destination: url) {
                        Label("MyAnimeList", systemImage: "arrow.up.right.square").font(.caption.weight(.semibold))
                    }
                }
            }
            .foregroundStyle(BKColor.textPrimary)
        }
        .padding(14)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow()
    }

    static func tag(_ raw: String) -> String {
        switch raw {
        case "Recommended": "Recommandé"
        case "Mixed Feelings": "Mitigé"
        case "Not Recommended": "Déconseillé"
        default: raw
        }
    }
}

private func emptyText(_ text: String) -> some View {
    Text(text).font(.subheadline).foregroundStyle(BKColor.textSecondary)
        .frame(maxWidth: .infinity, minHeight: 80)
}

// MARK: - News

struct WorkNewsList: View {
    let news: [TenraiNews]?

    var body: some View {
        VStack(spacing: BKSpace.md) {
            switch news {
            case nil:
                ProgressView().frame(maxWidth: .infinity, minHeight: 120)
            case let news? where news.isEmpty:
                emptyText("Aucune actu pour le moment.")
            case let news?:
                ForEach(news.prefix(15)) { item in row(item) }
            }
        }
    }

    @ViewBuilder
    private func row(_ item: TenraiNews) -> some View {
        let content = HStack(alignment: .top, spacing: 12) {
            AsyncImage(url: item.images?.jpg.imageUrl) { phase in
                if case .success(let image) = phase { image.resizable().aspectRatio(contentMode: .fill) } else { BKColor.surfaceTint }
            }
            .frame(width: 84, height: 84).clipped().bkInkBorder()
            VStack(alignment: .leading, spacing: 4) {
                Text(item.title).font(.subheadline.weight(.bold)).lineLimit(3).multilineTextAlignment(.leading)
                if let excerpt = item.excerpt {
                    Text(excerpt).font(.caption).foregroundStyle(BKColor.textSecondary).lineLimit(2).multilineTextAlignment(.leading)
                }
                HStack(spacing: 10) {
                    if let date = WorkDate.short(item.date) { Text(date) }
                    if let comments = item.comments { Label("\(comments)", systemImage: "bubble.left") }
                }
                .font(.caption2.weight(.semibold)).foregroundStyle(BKColor.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .foregroundStyle(BKColor.textPrimary)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow()

        if let url = item.url { Link(destination: url) { content }.buttonStyle(.plain) } else { content }
    }
}

// MARK: - Gallery

struct WorkGalleryGrid: View {
    let pictures: [TenraiPicture]?

    var body: some View {
        switch pictures {
        case nil:
            ProgressView().frame(maxWidth: .infinity, minHeight: 120)
        case let pictures? where pictures.isEmpty:
            emptyText("Aucune image pour le moment.")
        case let pictures?:
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(Array(pictures.enumerated()), id: \.offset) { _, picture in
                    Color.clear
                        .aspectRatio(0.7, contentMode: .fit)
                        .overlay { BKCover(url: picture.jpg.largeImageUrl ?? picture.jpg.imageUrl) }
                        .clipped()
                        .bkPanelShadow()
                }
            }
        }
    }
}

// MARK: - Statistics

struct WorkStaffSection: View {
    let staff: [TenraiStaff]
    @State private var shown = 6

    var body: some View {
        if !staff.isEmpty {
            VStack(alignment: .leading, spacing: BKSpace.lg) {
                WorkHeading(text: "Staff (principal)")
                LazyVGrid(columns: [GridItem(.flexible(), alignment: .top), GridItem(.flexible(), alignment: .top)], spacing: 18) {
                    ForEach(staff.prefix(shown)) { member in
                        VStack(spacing: 4) {
                            AsyncImage(url: member.person.images?.jpg.imageUrl) { phase in
                                if case .success(let image) = phase { image.resizable().aspectRatio(contentMode: .fill) } else { BKColor.surfaceTint }
                            }
                            .frame(width: 92, height: 92).clipShape(Circle())
                            .overlay(Circle().stroke(BKColor.border, lineWidth: 3))
                            Text(member.person.name).font(.footnote.weight(.bold)).multilineTextAlignment(.center)
                            Text(member.positions.joined(separator: ", "))
                                .font(.caption2).foregroundStyle(BKColor.textSecondary)
                                .multilineTextAlignment(.center).lineLimit(3)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                if staff.count > shown {
                    WorkDashedButton(title: "Voir plus") { withAnimation { shown += 6 } }
                }
            }
        }
    }
}

struct WorkStatsSection: View {
    let stats: TenraiStatistics
    let type: WorkType

    private var statuses: [(String, Int, Color)] {
        [
            ("En cours", stats.current ?? 0, BKColor.brandCyan),
            ("Terminé", stats.completed ?? 0, Color(red: 0.29, green: 0.87, blue: 0.5)),
            ("En pause", stats.onHold ?? 0, BKColor.warningFill),
            ("Abandonné", stats.dropped ?? 0, Color(white: 0.55)),
            ("Prévu", stats.planned ?? 0, BKColor.brandPink),
        ]
    }

    var body: some View {
        let total = max(stats.total ?? statuses.reduce(0) { $0 + $1.1 }, 1)
        VStack(alignment: .leading, spacing: BKSpace.lg) {
            VStack(alignment: .leading, spacing: 12) {
                Text("RÉPARTITION DANS LES BIBLIOTHÈQUES").font(BKFont.display(15))
                ForEach(statuses, id: \.0) { status in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(status.0).font(.subheadline.weight(.semibold))
                            Spacer()
                            Text(status.1.formatted(.number.locale(Locale(identifier: "fr_FR")))).font(.subheadline.weight(.bold))
                        }
                        GeometryReader { proxy in
                            ZStack(alignment: .leading) {
                                Rectangle().fill(BKColor.surfaceTint)
                                Rectangle().fill(status.2).frame(width: proxy.size.width * Double(status.1) / Double(total))
                            }
                        }
                        .frame(height: 10)
                        .bkInkBorder(BKColor.border, width: 1.5)
                    }
                }
                if let scores = stats.scores, !scores.isEmpty { distribution(scores) }
            }
            .padding(16)
            .foregroundStyle(BKColor.textPrimary)
            .background(BKColor.surface)
            .bkInkBorder()
            .bkPanelShadow()
        }
    }

    private func distribution(_ scores: [TenraiScoreBucket]) -> some View {
        let peak = max(scores.map(\.percentage).max() ?? 1, 1)
        return VStack(alignment: .leading, spacing: 8) {
            Text("RÉPARTITION DES NOTES").font(BKFont.display(15)).padding(.top, 8)
            HStack(alignment: .bottom, spacing: 5) {
                ForEach(scores.sorted { $0.score < $1.score }, id: \.score) { bucket in
                    VStack(spacing: 4) {
                        Rectangle()
                            .fill(bucket.score >= 8 ? BKColor.brandPink : BKColor.textPrimary.opacity(0.75))
                            .frame(height: max(3, 90 * bucket.percentage / peak))
                        Text("\(bucket.score)").font(BKFont.display(11, weight: .heavy))
                    }
                    .frame(maxWidth: .infinity)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Note \(bucket.score) : \(Int(bucket.percentage.rounded())) %")
                }
            }
            .frame(height: 112, alignment: .bottom)
        }
    }
}

// MARK: - Vous aimerez aussi

struct WorkRecommendationsGrid: View {
    let items: [(work: Work, votes: Int?)]
    @State private var shown = 12

    var body: some View {
        if !items.isEmpty {
            VStack(spacing: BKSpace.lg) {
                Text("VOUS AIMEREZ AUSSI").font(BKFont.display(26)).frame(maxWidth: .infinity)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 16, alignment: .top), GridItem(.flexible(), spacing: 16, alignment: .top)], spacing: 22) {
                    ForEach(items.prefix(shown), id: \.work.id) { item in
                        NavigationLink(value: item.work) {
                            VStack(alignment: .leading, spacing: 8) {
                                VStack(spacing: 0) {
                                    Color.clear
                                        .aspectRatio(0.72, contentMode: .fit)
                                        .overlay { BKCover(url: item.work.image ?? item.work.imageSmall, showsBorder: false) }
                                        .clipped()
                                    if let votes = item.votes {
                                        Text("\(votes) VOTES").font(BKFont.display(12))
                                            .frame(maxWidth: .infinity).frame(height: 26)
                                            .foregroundStyle(.white).background(Color.black)
                                    }
                                }
                                .bkInkBorder()
                                .bkPanelShadow(offset: 5)
                                Text(item.work.title.uppercased())
                                    .font(BKFont.display(14)).lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                    .foregroundStyle(BKColor.textPrimary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                if items.count > shown {
                    WorkDashedButton(title: "Voir plus") { withAnimation { shown += 12 } }
                }
            }
            .foregroundStyle(BKColor.textPrimary)
        }
    }
}

// MARK: - Infos

struct WorkInfoPanel: View {
    let work: Work
    let extras: TenraiFullExtras

    /// Same cards as the web `WorkInfoGrid` (Saison, Studio, Rang, Popularité),
    /// in that order, then the rest of the data in the same style.
    private var cards: [(icon: String, label: String, value: String)] {
        var cards: [(String, String, String)] = []
        func add(_ icon: String, _ label: String, _ value: String?) {
            if let value, !value.isEmpty { cards.append((icon, label, value)) }
        }
        if work.type == .anime {
            add("calendar", "Saison", WorkFormat.season(extras.season, year: work.year))
            add("video", "Studio", extras.studios?.first?.name)
        }
        add("trophy", "Rang", extras.rank.map { "#\($0)" })
        add("chart.bar", "Popularité", extras.popularity.map { "#\($0)" })
        add("dot.radiowaves.left.and.right", "Statut", WorkFormat.status(extras.status))
        if work.type == .anime {
            add("clock", "Durée", WorkFormat.duration(extras.duration))
            add("person.2", "Public", WorkFormat.rating(extras.rating))
        } else {
            add("pencil", "Auteur", extras.authors?.first.map { Self.authorName($0.name) })
            add("newspaper", "Magazine", extras.serializations?.first?.name)
        }
        add("book.closed", "Source", WorkFormat.source(extras.source))
        return cards
    }

    var body: some View {
        let cards = cards
        if !cards.isEmpty {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(Array(cards.enumerated()), id: \.offset) { _, card in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 5) {
                            Image(systemName: card.icon).font(.system(size: 11, weight: .semibold))
                            Text(card.label.uppercased()).font(.system(size: 11, weight: .bold)).tracking(0.3)
                        }
                        .foregroundStyle(BKColor.textSecondary)
                        Text(card.value.uppercased())
                            .font(BKFont.display(17))
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity, minHeight: 50, alignment: .topLeading)
                    .padding(.horizontal, 12).padding(.vertical, 10)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder()
                    .bkPanelShadow()
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }

    /// "Okada, Mari" → "Mari Okada" (MAL stores family name first with a comma).
    static func authorName(_ raw: String) -> String {
        let parts = raw.components(separatedBy: ", ")
        return parts.count == 2 ? "\(parts[1]) \(parts[0])" : raw
    }

    /// "Apr 5, 2009 to Jul 4, 2010" → "5 avr. 2009 → 4 juil. 2010".
    static func frenchDates(_ raw: String) -> String {
        let input = DateFormatter()
        input.locale = Locale(identifier: "en_US_POSIX")
        let output = DateFormatter()
        output.locale = Locale(identifier: "fr_FR")
        func convert(_ part: String) -> String {
            let trimmed = part.trimmingCharacters(in: .whitespaces)
            if trimmed == "?" { return "en cours" }
            for (inFormat, outFormat) in [("MMM d, yyyy", "d MMM yyyy"), ("MMM yyyy", "MMM yyyy"), ("yyyy", "yyyy")] {
                input.dateFormat = inFormat
                if let date = input.date(from: trimmed) {
                    output.dateFormat = outFormat
                    return output.string(from: date)
                }
            }
            return trimmed
        }
        return raw.components(separatedBy: " to ").map(convert).joined(separator: " → ")
    }
}

// MARK: - Music

struct WorkMusicSection: View {
    let theme: TenraiThemeSongs

    var body: some View {
        let openings = theme.openings ?? [], endings = theme.endings ?? []
        if !openings.isEmpty || !endings.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                WorkHeading(text: "Musiques", icon: "music.note")
                VStack(alignment: .leading, spacing: BKSpace.md) {
                    if !openings.isEmpty { list("Openings", openings, color: BKColor.brandPink) }
                    if !endings.isEmpty { list("Endings", endings, color: BKColor.brandCyan) }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(BKColor.surface)
                .bkInkBorder()
                .bkPanelShadow()
            }
        }
    }

    private func list(_ title: String, _ songs: [String], color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(BKFont.display(11, weight: .heavy)).tracking(0.6)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .foregroundStyle(.black).background(color)
            ForEach(Array(songs.prefix(8).enumerated()), id: \.offset) { _, raw in
                let song = WorkFormat.song(raw)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: "music.note").font(.caption.weight(.bold)).foregroundStyle(BKColor.textSecondary)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(song.title).font(.subheadline.weight(.semibold))
                        if let detail = song.detail {
                            Text(detail).font(.caption2).foregroundStyle(BKColor.textSecondary)
                        }
                    }
                }
            }
        }
    }
}

