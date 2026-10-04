import SwiftUI

enum ProfileRoute: Hashable { case main, settings }

/// Profil — Hunter License card + Profil Nen radar + stats (board `S09-Profile`).
struct ProfileView: View {
    @Environment(\.userStore) private var userStore
    @Environment(\.libraryStore) private var library
    @State private var showEditor = false

    private var shareURL: URL? { URL(string: "https://bingeki.web.app/fr/profile/\(userStore.profile.uid)") }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BKSpace.xl) {
                HunterLicenseCard(profile: userStore.profile, topWorks: topWorks)
                editButton
                NenChartView(profile: userStore.profile)
                statsGrid
                if !userStore.profile.badges.isEmpty { recentBadges }
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.vertical, BKSpace.lg)
        }
        .safeAreaInset(edge: .top, spacing: 0) { header }
        .background(alignment: .top) { HalftoneDots().frame(height: 260).ignoresSafeArea(edges: .top) }
        .background(BKColor.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .fullScreenCover(isPresented: $showEditor) {
            ProfileEditView()
                .environment(\.userStore, userStore)
                .environment(\.libraryStore, library)
        }
    }

    /// Inked square buttons like the mockup, title centred between them.
    private var header: some View {
        HStack(spacing: BKSpace.sm) {
            Color.clear.frame(width: 44 * 2 + BKSpace.sm, height: 44)
            Text("Mon profil")
                .font(BKFont.display(16))
                .textCase(.uppercase)
                .tracking(1)
                .frame(maxWidth: .infinity)
                .accessibilityAddTraits(.isHeader)
            if let shareURL {
                ShareLink(item: shareURL) { headerIcon("square.and.arrow.up") }
                    .accessibilityLabel("Partager ma licence")
            }
            NavigationLink(value: ProfileRoute.settings) { headerIcon("gearshape") }
                .accessibilityLabel("Réglages")
        }
        .buttonStyle(.plain)
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.vertical, BKSpace.sm)
    }

    private func headerIcon(_ systemName: String) -> some View {
        Image(systemName: systemName)
            .font(.body.weight(.bold))
            .frame(width: 44, height: 44)
            .foregroundStyle(BKColor.textPrimary)
            .background(BKColor.surface)
            .bkInkBorder(BKColor.border)
    }

    private var topWorks: [Work] {
        userStore.profile.top3Favorites.compactMap { library.work(id: $0) }
    }

    private var editButton: some View {
        BKPrimaryButton(title: "Personnaliser ma licence", systemImage: "pencil") { showEditor = true }
    }

    private var statsGrid: some View {
        let profile = userStore.profile
        let tiles: [(value: String, label: String, highlight: Bool)] = [
            ("\(profile.totalChaptersRead)", "Chapitres", false),
            ("\(profile.totalAnimeEpisodesWatched)", "Épisodes", false),
            ("\(profile.totalMoviesWatched)", "Films", false),
            ("\(profile.streak) j", "Série", true),
            ("\(library.works(status: .reading).count)", "En cours", false),
            ("\(library.works(status: .completed).count)", "Terminés", false),
            ("\(library.works.count)", "Collection", false),
            ("\(profile.badges.count)", "Badges", false),
        ]
        return VStack(alignment: .leading, spacing: BKSpace.md) {
            Text("Stats").font(BKFont.title3).bkLabelStyle()
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(tiles, id: \.label) { tile in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(tile.value)
                            .font(BKFont.display(20))
                            .minimumScaleFactor(0.6)
                            .lineLimit(1)
                            .foregroundStyle(tile.highlight ? BKColor.orangeText : BKColor.textPrimary)
                        Text(tile.label.uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .lineLimit(1)
                            .foregroundStyle(BKColor.textSecondary)
                    }
                    .padding(.vertical, 10).padding(.horizontal, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(BKColor.surface)
                    .bkInkBorder()
                    .bkPanelShadow(tile.highlight ? BKColor.warningFill : BKColor.ink, offset: 3)
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }

    private var recentBadges: some View {
        let recent = userStore.profile.badges
            .sorted { ($0.unlockedAt ?? .distantPast) > ($1.unlockedAt ?? .distantPast) }
            .prefix(4)
        return VStack(alignment: .leading, spacing: 10) {
            Text("Badges récents").font(BKFont.title3).bkLabelStyle()
            HStack(spacing: 8) {
                ForEach(Array(recent)) { badge in
                    HStack(spacing: 4) {
                        Image(systemName: badge.symbolName).font(.caption.weight(.bold))
                        Text(badge.name).font(.system(size: 11, weight: .heavy)).lineLimit(2).minimumScaleFactor(0.8)
                    }
                    .foregroundStyle(BKColor.textPrimary)
                    .padding(.horizontal, 4)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(BKColor.surface)
                    .bkInkBorder(badge.rarity.tint)
                    .accessibilityLabel("\(badge.name), \(badge.rarity.label)")
                }
            }
        }
    }
}

/// The card — banner, square avatar with level tag, bio, featured badge, top 3, XP.
/// Colours come from the profile so the editor can preview live.
struct HunterLicenseCard: View {
    let profile: UserProfile
    var topWorks: [Work] = []

    private var accent: Color { Color(hex: profile.themeColor) ?? BKColor.brandPink }
    private var cardBg: Color { Color(hex: profile.cardBgColor) ?? Color(red: 0.06, green: 0.08, blue: 0.14) }
    private var border: Color { Color(hex: profile.borderColor) ?? .black }
    private var isDark: Bool { Color.luminance(hex: profile.cardBgColor) < 0.35 }
    private var text: Color { isDark ? .white : Color(white: 0.07) }
    private var dim: Color { isDark ? .white.opacity(0.7) : .black.opacity(0.62) }
    private var onAccent: Color { Color.luminance(hex: profile.themeColor) > 0.4 ? .black : .white }
    private var onBorder: Color { Color.luminance(hex: profile.borderColor) > 0.4 ? .black : .white }

    private var bannerURL: URL? {
        profile.banner.flatMap(URL.init(string:)) ?? topWorks.first?.image
    }

    private var idLine: String {
        let id = "ID : \(String(profile.uid.prefix(8)).uppercased())"
        guard let createdAt = profile.createdAt else { return id }
        let since = createdAt.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "fr_FR")))
        return "\(id) · depuis \(since)"
    }

    private var featured: Badge? {
        profile.badges.first { $0.id == profile.featuredBadge }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                if let bannerURL {
                    BKCover(url: bannerURL, showsBorder: false)
                } else {
                    LinearGradient(colors: [accent.opacity(0.6), cardBg], startPoint: .top, endPoint: .bottom)
                }
            }
            .frame(height: 124)
            .clipped()
            .overlay(alignment: .bottom) { Rectangle().fill(border).frame(height: 2) }

            HStack {
                Text("LICENCE DE CHASSEUR").font(BKFont.display(12)).tracking(1.7)
                Spacer()
                Text("RANG \(profile.rank)")
                    .font(BKFont.display(12))
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .foregroundStyle(.white)
                    .background(Self.rankColor(profile.rank))
                    .bkInkBorder()
            }
            .foregroundStyle(onBorder)
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(border)

            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .bottom, spacing: 14) {
                    avatar
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profile.displayName ?? "Chasseur")
                            .font(BKFont.display(28))
                            .textCase(.uppercase)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Text(idLine)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(dim)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .padding(.bottom, 4)
                }
                // The avatar straddles the "Licence de chasseur" strip.
                .padding(.top, -40)
                .padding(.bottom, 6)

                if let bio = profile.bio, !bio.isEmpty {
                    Text("« \(bio) »")
                        .font(.subheadline.italic())
                        .padding(.leading, 12)
                        .overlay(alignment: .leading) { Rectangle().fill(accent).frame(width: 3) }
                }

                if let featured { featuredRow(featured) }

                if !topWorks.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("MON TOP 3").font(BKFont.display(11, weight: .heavy)).tracking(0.9).foregroundStyle(dim)
                        HStack(spacing: 10) {
                            ForEach(Array(topWorks.prefix(3).enumerated()), id: \.offset) { index, work in
                                BKCover(url: work.image, showsBorder: false)
                                    .frame(width: 96, height: 136)
                                    .overlay(Rectangle().stroke(border, lineWidth: 2))
                                    .overlay(alignment: .topLeading) {
                                        Text("#\(index + 1)")
                                            .font(BKFont.display(13))
                                            .padding(.horizontal, 7).padding(.vertical, 1)
                                            .foregroundStyle(onAccent)
                                            .background(accent)
                                    }
                                    .accessibilityLabel("Top \(index + 1) : \(work.title)")
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("XP")
                        Spacer()
                        Text("\(profile.xp) / \(profile.xpToNextLevel)")
                    }
                    .font(.footnote.weight(.bold))
                    GeometryReader { proxy in
                        Rectangle().fill(accent)
                            .frame(width: proxy.size.width * min(1, Double(profile.xp) / Double(max(profile.xpToNextLevel, 1))))
                    }
                    .frame(height: 12)
                    .background(Color.gray.opacity(0.18))
                    .overlay(Rectangle().stroke(border, lineWidth: 2))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 18)
        }
        .foregroundStyle(text)
        .background(cardBg)
        .overlay(Rectangle().stroke(border, lineWidth: 3))
        .bkPanelShadow(accent, offset: 6)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Licence de chasseur de \(profile.displayName ?? "Chasseur"), niveau \(profile.level), rang \(profile.rank)")
    }

    private var avatar: some View {
        ZStack {
            LinearGradient(colors: [BKColor.brandCyan, Color(red: 0.145, green: 0.165, blue: 0.204)], startPoint: .topLeading, endPoint: .bottomTrailing)
            Text(String((profile.displayName ?? "C").prefix(1)).uppercased())
                .font(BKFont.display(40))
                .foregroundStyle(.white)
                .shadow(color: .black, radius: 0, x: 2, y: 2)
        }
        .frame(width: 88, height: 88)
        .overlay(Rectangle().stroke(border, lineWidth: 3))
        .overlay(alignment: .bottom) {
            Text("LVL \(profile.level)")
                .font(BKFont.display(12))
                .padding(.horizontal, 8).padding(.vertical, 1)
                .foregroundStyle(onAccent)
                .background(accent)
                .overlay(Rectangle().stroke(border, lineWidth: 2))
                .rotationEffect(.degrees(-3))
                .offset(y: 12)
        }
    }

    private func featuredRow(_ badge: Badge) -> some View {
        HStack(spacing: 10) {
            Image(systemName: badge.symbolName)
                .font(.body.weight(.bold))
                .foregroundStyle(badge.rarity.tint)
                .frame(width: 40, height: 40)
                .background(Circle().fill(.white))
                .overlay(Circle().stroke(badge.rarity.tint, lineWidth: 2))
            VStack(alignment: .leading, spacing: 1) {
                Text("BADGE VEDETTE").font(BKFont.display(11, weight: .heavy)).tracking(0.9).foregroundStyle(dim)
                (Text(badge.name).font(.subheadline.weight(.heavy))
                 + Text(" · \(badge.rarity.label)").font(BKFont.display(11)).foregroundColor(badge.rarity.tint))
            }
            Spacer(minLength: 0)
        }
        .padding(8)
        .background(isDark ? Color.white.opacity(0.08) : Color.black.opacity(0.04))
        .overlay(Rectangle().stroke(border, lineWidth: 2))
    }

    /// Same palette as the web's `getRankColor`.
    static func rankColor(_ rank: String) -> Color {
        switch rank {
        case "S": return Color(hex: "#D4AF37")!
        case "A": return Color(hex: "#FF4500")!
        case "B": return Color(hex: "#8A2BE2")!
        case "C": return Color(hex: "#0000CD")!
        case "D": return Color(hex: "#228B22")!
        case "E": return Color(hex: "#696969")!
        default: return .black
        }
    }
}

/// Radar chart — 6 labelled axes, formulas from `GamificationCore.nenAxes`.
struct NenChartView: View {
    let profile: UserProfile

    var body: some View {
        let axes = GamificationCore.nenAxes(for: profile)
        VStack(alignment: .leading, spacing: BKSpace.xs) {
            HStack {
                Text("Profil Nen").font(BKFont.title3).bkLabelStyle()
                Spacer()
                Text("calculé sur tes stats").font(.caption).foregroundStyle(BKColor.textSecondary)
            }
            GeometryReader { proxy in
                let center = CGPoint(x: proxy.size.width / 2, y: proxy.size.height / 2)
                let radius = min(proxy.size.width, proxy.size.height) / 2 - 30
                ZStack {
                    Canvas { context, _ in
                        func point(_ index: Int, _ fraction: Double) -> CGPoint {
                            let angle = (Double(index) * 60 - 90) * .pi / 180
                            return CGPoint(x: center.x + radius * fraction * cos(angle), y: center.y + radius * fraction * sin(angle))
                        }
                        for ring in [0.33, 0.66, 1.0] {
                            var path = Path()
                            for i in 0..<6 { i == 0 ? path.move(to: point(i, ring)) : path.addLine(to: point(i, ring)) }
                            path.closeSubpath()
                            context.stroke(path, with: .color(BKColor.border.opacity(ring == 1 ? 0.6 : 0.35)), lineWidth: ring == 1 ? 1.5 : 1)
                        }
                        var data = Path()
                        for (i, axis) in axes.enumerated() {
                            let p = point(i, max(0.04, axis.value / 100))
                            i == 0 ? data.move(to: p) : data.addLine(to: p)
                        }
                        data.closeSubpath()
                        context.fill(data, with: .color(BKColor.brandPink.opacity(0.35)))
                        context.stroke(data, with: .color(BKColor.brandPink), style: StrokeStyle(lineWidth: 3, lineJoin: .miter))
                    }
                    ForEach(Array(axes.enumerated()), id: \.offset) { i, axis in
                        let angle = (Double(i) * 60 - 90) * .pi / 180
                        Text(axis.label.uppercased())
                            .font(BKFont.display(11, weight: .heavy))
                            .tracking(0.6)
                            .fixedSize()
                            .position(x: center.x + (radius + 18) * cos(angle) + (abs(cos(angle)) < 0.1 ? 0 : (cos(angle) > 0 ? 24 : -24)),
                                      y: center.y + (radius + 14) * sin(angle))
                    }
                }
            }
            .frame(height: 230)
            .accessibilityElement()
            .accessibilityLabel("Radar : " + axes.map { "\($0.label) \(Int($0.value))" }.joined(separator: ", "))
        }
        .padding(.horizontal, 14).padding(.top, 14).padding(.bottom, 8)
        .background(BKColor.surface)
        .bkInkBorder()
        .bkPanelShadow()
    }
}

/// Faint dotted backdrop behind screen headers (`.ht` on the mockups).
struct HalftoneDots: View {
    var body: some View {
        Canvas { context, size in
            var x: CGFloat = 0
            while x < size.width {
                var y: CGFloat = 0
                while y < size.height {
                    context.fill(Path(ellipseIn: CGRect(x: x, y: y, width: 2.8, height: 2.8)), with: .color(BKColor.textPrimary.opacity(0.08)))
                    y += 14
                }
                x += 14
            }
        }
        .mask(LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom))
        .accessibilityHidden(true)
    }
}

extension Rarity {
    var tint: Color {
        switch self {
        case .common: return Color(white: 0.54)
        case .rare: return BKColor.brandCyan
        case .epic: return Color(hex: "#8A2BE2")!
        case .legendary: return Color(hex: "#D4AF37")!
        }
    }
}

extension Color {
    /// `#RRGGBB` → `Color`, used for the license's stored hex tokens.
    init?(hex: String) {
        var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        h.removeAll { $0 == "#" }
        guard h.count == 6, let value = UInt32(h, radix: 16) else { return nil }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }

    /// WCAG relative luminance of a `#RRGGBB` string (0 = black, 1 = white).
    static func luminance(hex: String) -> Double {
        var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        h.removeAll { $0 == "#" }
        guard h.count == 6, let value = UInt32(h, radix: 16) else { return 0 }
        func channel(_ shift: UInt32) -> Double {
            let v = Double((value >> shift) & 0xFF) / 255
            return v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
    }
}

#Preview {
    NavigationStack {
        ProfileView()
            .environment(\.userStore, InMemoryUserStore.preview)
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
    }
}
