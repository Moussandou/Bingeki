import SwiftUI

enum ProfileRoute: Hashable { case main, settings }

/// Profil — Hunter License card + Profil Nen radar + stats (board `S09-Profile`).
struct ProfileView: View {
    @Environment(\.userStore) private var userStore
    @Environment(\.libraryStore) private var library
    @State private var showEditor = false

    var body: some View {
        ScrollView {
            VStack(spacing: BKSpace.xl) {
                HunterLicenseCard(profile: userStore.profile, topWorks: topWorks)
                editButton
                NenChartView(profile: userStore.profile)
                statsGrid
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.vertical, BKSpace.lg)
        }
        .background(BKColor.background)
        .navigationTitle("Mon profil")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                NavigationLink(value: ProfileRoute.settings) {
                    Image(systemName: "gearshape")
                }
            }
        }
        .fullScreenCover(isPresented: $showEditor) { ProfileEditView() }
    }

    private var topWorks: [Work] {
        userStore.profile.top3Favorites.compactMap { library.work(id: $0) }
    }

    private var editButton: some View {
        Button {
            showEditor = true
        } label: {
            Label("Personnaliser ma licence", systemImage: "pencil")
                .font(BKFont.ctaLabel)
                .frame(maxWidth: .infinity, minHeight: BKSize.ctaHeight)
                .foregroundStyle(.white)
                .background(BKColor.ctaFill)
                .clipShape(BKChamferedShape(cut: 10))
        }
    }

    private var statsGrid: some View {
        let profile = userStore.profile
        let tiles: [(String, String)] = [
            ("\(profile.totalChaptersRead)", "Chapitres"),
            ("\(profile.totalAnimeEpisodesWatched)", "Épisodes"),
            ("\(profile.totalMoviesWatched)", "Films"),
            ("\(profile.streak) j", "Série"),
            ("\(library.works(status: .reading).count)", "En cours"),
            ("\(profile.totalWorksCompleted)", "Terminés"),
            ("\(profile.totalWorksAdded)", "Collection"),
        ]
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
            ForEach(tiles, id: \.1) { value, label in
                VStack(alignment: .leading, spacing: 2) {
                    Text(value).font(BKFont.display(20))
                    Text(label).font(.caption2.weight(.bold)).foregroundStyle(BKColor.textSecondary)
                }
                .padding(BKSpace.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(BKColor.surface)
                .bkInkBorder()
                .bkPanelShadow(offset: 3)
            }
        }
    }
}

/// The card itself — banner, avatar with level pill, bio, top 3, XP bar.
/// Colors are driven by `profile.themeColor/cardBgColor/borderColor` so the
/// personalization screen can preview live.
struct HunterLicenseCard: View {
    let profile: UserProfile
    var topWorks: [Work] = []

    private var accent: Color { Color(hex: profile.themeColor) ?? BKColor.brandPink }
    private var cardBg: Color { Color(hex: profile.cardBgColor) ?? Color(white: 0.08) }
    private var border: Color { Color(hex: profile.borderColor) ?? .black }

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                if let banner = topWorks.first?.image {
                    BKCover(url: banner)
                } else {
                    LinearGradient(colors: [accent.opacity(0.5), .black], startPoint: .top, endPoint: .bottom)
                }
            }
            .frame(height: 100)
            .clipped()

            HStack {
                Text("LICENCE DE CHASSEUR").font(BKFont.display(11)).tracking(1.5)
                Spacer()
                Text("RANG \(profile.rank)").font(BKFont.display(11))
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color.green).foregroundStyle(.white)
            }
            .padding(.horizontal, BKSpace.md).padding(.vertical, BKSpace.sm)
            .background(border)
            .foregroundStyle(.white)

            VStack(alignment: .leading, spacing: BKSpace.md) {
                HStack(alignment: .bottom, spacing: BKSpace.md) {
                    ZStack(alignment: .bottom) {
                        Circle()
                            .fill(LinearGradient(colors: [BKColor.brandCyan, .indigo], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 72, height: 72)
                            .overlay(Circle().stroke(border, lineWidth: 3))
                        Text("LVL \(profile.level)")
                            .font(BKFont.display(11))
                            .padding(.horizontal, 6)
                            .background(accent)
                            .foregroundStyle(.black)
                            .offset(y: 10)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profile.displayName ?? "Chasseur").font(BKFont.title1)
                        Text("ID · \(String(profile.uid.prefix(8)).uppercased())").font(.caption).foregroundStyle(.white.opacity(0.6))
                    }
                    Spacer()
                }
                .padding(.top, BKSpace.lg)

                if let bio = profile.bio, !bio.isEmpty {
                    Text("« \(bio) »")
                        .font(.subheadline.italic())
                        .overlay(alignment: .leading) { Rectangle().fill(accent).frame(width: 3) }
                        .padding(.leading, BKSpace.sm)
                }

                if !topWorks.isEmpty {
                    HStack(spacing: BKSpace.sm) {
                        ForEach(Array(topWorks.prefix(3).enumerated()), id: \.offset) { index, work in
                            ZStack(alignment: .topLeading) {
                                BKCover(url: work.image).frame(width: 90, height: 128)
                                Text("#\(index + 1)")
                                    .font(BKFont.display(12))
                                    .padding(.horizontal, 6)
                                    .background(accent)
                                    .foregroundStyle(.black)
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("XP").font(.subheadline.weight(.bold))
                        Spacer()
                        Text("\(profile.xp) / \(profile.xpToNextLevel)").font(.subheadline)
                    }
                    ProgressView(value: Double(profile.xp), total: Double(max(profile.xpToNextLevel, 1)))
                        .tint(accent)
                }
            }
            .padding(BKSpace.lg)
        }
        .foregroundStyle(.white)
        .background(cardBg)
        .overlay(RoundedRectangle(cornerRadius: 0).stroke(border, lineWidth: 3))
        .bkPanelShadow(accent, offset: 6)
    }
}

/// Radar chart — 6 axes, formulas from `GamificationCore.nenAxes`.
struct NenChartView: View {
    let profile: UserProfile

    var body: some View {
        let axes = GamificationCore.nenAxes(for: profile)
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            HStack {
                Text("Profil Nen").font(BKFont.title3).bkLabelStyle()
                Spacer()
                Text("calculé sur tes stats").font(.caption).foregroundStyle(BKColor.textSecondary)
            }
            Canvas { context, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let radius = min(size.width, size.height) / 2 - 20

                func point(_ index: Int, fraction: Double) -> CGPoint {
                    let angle = (Double(index) * 60 - 90) * .pi / 180
                    return CGPoint(
                        x: center.x + radius * fraction * cos(angle),
                        y: center.y + radius * fraction * sin(angle)
                    )
                }

                for ring in [0.33, 0.66, 1.0] {
                    var path = Path()
                    for i in 0..<6 {
                        let p = point(i, fraction: ring)
                        i == 0 ? path.move(to: p) : path.addLine(to: p)
                    }
                    path.closeSubpath()
                    context.stroke(path, with: .color(BKColor.border.opacity(0.4)))
                }

                var dataPath = Path()
                for (i, axis) in axes.enumerated() {
                    let p = point(i, fraction: axis.value / 100)
                    i == 0 ? dataPath.move(to: p) : dataPath.addLine(to: p)
                }
                dataPath.closeSubpath()
                context.fill(dataPath, with: .color(BKColor.brandPink.opacity(0.35)))
                context.stroke(dataPath, with: .color(BKColor.brandPink), lineWidth: 3)
            }
            .frame(height: 220)
            .accessibilityLabel(axes.map { "\($0.label) \(Int($0.value))" }.joined(separator: ", "))
        }
        .padding(BKSpace.md)
        .background(BKColor.surface)
        .bkInkBorder()
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
}

#Preview {
    NavigationStack {
        ProfileView()
            .environment(\.userStore, InMemoryUserStore.preview)
            .environment(\.libraryStore, InMemoryLibraryStore.preview)
    }
}
