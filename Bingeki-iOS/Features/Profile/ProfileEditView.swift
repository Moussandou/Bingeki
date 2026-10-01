import SwiftUI

/// Personnaliser — live preview of `HunterLicenseCard` while editing colors,
/// top 3 and bio, matching `ProfileEdit.dc.html` on the canvas. No per-field
/// "Save": every change applies directly to the store; "Fermer" just dismisses.
struct ProfileEditView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.userStore) private var userStore
    @Environment(\.libraryStore) private var library
    @State private var tab: Tab = .colors

    private enum Tab: String, CaseIterable {
        case colors = "Couleurs", banner = "Bannière", top3 = "Top 3", badge = "Badge", bio = "Pseudo & bio"
    }

    private let presets: [(name: String, accent: String, bg: String, border: String)] = [
        ("Nuit", "#FF2E63", "#0F1424", "#000000"),
        ("Bingeki", "#FF2E63", "#FFFFFF", "#000000"),
        ("Cyber", "#08D9D6", "#0B1020", "#08D9D6"),
        ("Or", "#D4AF37", "#1A1A1A", "#D4AF37"),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: BKSpace.lg) {
                HunterLicenseCard(profile: userStore.profile, topWorks: topWorks)
                    .padding(.horizontal, BKSpace.screenMargin)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: BKSpace.sm) {
                        ForEach(Tab.allCases, id: \.self) { item in
                            Button { tab = item } label: {
                                Text(item.rawValue)
                                    .font(.subheadline.weight(tab == item ? .bold : .semibold))
                                    .padding(.horizontal, 12)
                                    .frame(height: 36)
                                    .foregroundStyle(tab == item ? .black : BKColor.textPrimary)
                                    .background(tab == item ? BKColor.brandPink : .clear)
                                    .overlay(Rectangle().stroke(tab == item ? BKColor.ink : BKColor.border, lineWidth: 2))
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(tab == item ? .isSelected : [])
                        }
                    }
                    .padding(.horizontal, BKSpace.screenMargin)
                }

                ScrollView {
                    switch tab {
                    case .colors: colorsTab
                    case .banner: bannerTab
                    case .top3: top3Tab
                    case .badge: badgeTab
                    case .bio: bioTab
                    }
                }
            }
            .padding(.top, BKSpace.md)
            .background(BKColor.background.ignoresSafeArea())
            .navigationTitle("Personnaliser")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("OK") { dismiss() } }
            }
        }
    }

    private var topWorks: [Work] {
        userStore.profile.top3Favorites.compactMap { library.work(id: $0) }
    }

    private var colorsTab: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: BKSpace.sm) {
            ForEach(presets, id: \.name) { preset in
                Button {
                    userStore.update {
                        $0.themeColor = preset.accent
                        $0.cardBgColor = preset.bg
                        $0.borderColor = preset.border
                    }
                } label: {
                    VStack(spacing: 6) {
                        Rectangle()
                            .fill(Color(hex: preset.bg) ?? .black)
                            .frame(height: 30)
                            .overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(hex: preset.border) ?? .black, lineWidth: 2))
                        Text(preset.name).font(.caption.weight(.semibold)).foregroundStyle(BKColor.textPrimary)
                    }
                }
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }

    /// Banner = any cover from the library (stored as a URL string, like the web).
    private var bannerTab: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            Text("Une couverture de ta biblio").font(.caption).foregroundStyle(BKColor.textSecondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                Button {
                    userStore.update { $0.banner = nil }
                } label: {
                    Text("Auto")
                        .font(BKFont.display(14))
                        .frame(maxWidth: .infinity, minHeight: 64)
                        .foregroundStyle(BKColor.textPrimary)
                        .overlay(Rectangle().stroke(userStore.profile.banner == nil ? BKColor.brandPink : BKColor.border, lineWidth: userStore.profile.banner == nil ? 3 : 2))
                }
                .accessibilityLabel("Bannière automatique, ton top 1")
                ForEach(library.works.filter { $0.image != nil }) { work in
                    let selected = userStore.profile.banner == work.image?.absoluteString
                    Button {
                        userStore.update { $0.banner = work.image?.absoluteString }
                    } label: {
                        BKCover(url: work.image)
                            .frame(height: 64)
                            .overlay(Rectangle().stroke(selected ? BKColor.brandPink : .clear, lineWidth: 3))
                    }
                    .accessibilityLabel("Bannière : \(work.title)")
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }

    /// Featured badge among those the server already unlocked.
    private var badgeTab: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            if userStore.profile.badges.isEmpty {
                Text("Aucun badge débloqué pour l'instant. Ajoute et termine des titres pour en gagner.")
                    .font(.subheadline)
                    .foregroundStyle(BKColor.textSecondary)
            } else {
                ForEach(userStore.profile.badges) { badge in
                    let selected = userStore.profile.featuredBadge == badge.id
                    Button {
                        userStore.update { $0.featuredBadge = selected ? nil : badge.id }
                    } label: {
                        HStack(spacing: BKSpace.md) {
                            Image(systemName: badge.symbolName)
                                .foregroundStyle(badge.rarity.tint)
                                .frame(width: 36, height: 36)
                                .overlay(Rectangle().stroke(badge.rarity.tint, lineWidth: 2))
                            VStack(alignment: .leading, spacing: 1) {
                                Text(badge.name).font(.subheadline.weight(.bold))
                                Text(badge.description).font(.caption).foregroundStyle(BKColor.textSecondary)
                            }
                            Spacer()
                            if selected { Image(systemName: "checkmark").font(.body.weight(.black)).foregroundStyle(BKColor.accentText) }
                        }
                        .padding(10)
                        .foregroundStyle(BKColor.textPrimary)
                        .background(BKColor.surface)
                        .overlay(Rectangle().stroke(selected ? BKColor.brandPink : BKColor.border, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }

    private var top3Tab: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            Text("Tape pour placer · tes terminés").font(.caption).foregroundStyle(BKColor.textSecondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(library.works(status: .completed) + library.works.filter { $0.status != .completed }) { work in
                    let selected = userStore.profile.top3Favorites.contains(work.id)
                    Button {
                        userStore.update { profile in
                            if let index = profile.top3Favorites.firstIndex(of: work.id) {
                                profile.top3Favorites.remove(at: index)
                            } else if profile.top3Favorites.count < 3 {
                                profile.top3Favorites.append(work.id)
                            } else {
                                profile.top3Favorites[2] = work.id
                            }
                        }
                    } label: {
                        BKCover(url: work.image)
                            .aspectRatio(0.72, contentMode: .fit)
                            .opacity(selected ? 1 : 0.6)
                            .overlay(RoundedRectangle(cornerRadius: 0).stroke(selected ? BKColor.brandPink : .clear, lineWidth: 3))
                    }
                }
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }

    private var bioTab: some View {
        VStack(alignment: .leading, spacing: BKSpace.lg) {
            VStack(alignment: .leading, spacing: 6) {
                Text("PSEUDO").font(BKFont.caption).foregroundStyle(BKColor.textSecondary)
                TextField(
                    "Pseudo",
                    text: Binding(
                        get: { userStore.profile.displayName ?? "" },
                        set: { name in userStore.update { $0.displayName = name } }
                    )
                )
                .textFieldStyle(.roundedBorder)
            }
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("BIO").font(BKFont.caption).foregroundStyle(BKColor.textSecondary)
                    Spacer()
                    Text("\(userStore.profile.bio?.count ?? 0) / 160").font(.caption).foregroundStyle(BKColor.textSecondary)
                }
                TextField(
                    "Bio",
                    text: Binding(
                        get: { userStore.profile.bio ?? "" },
                        set: { bio in userStore.update { $0.bio = String(bio.prefix(160)) } }
                    ),
                    axis: .vertical
                )
                .lineLimit(3...5)
                .textFieldStyle(.roundedBorder)
            }
        }
        .padding(.horizontal, BKSpace.screenMargin)
    }
}

#Preview {
    ProfileEditView()
        .environment(\.userStore, InMemoryUserStore.preview)
        .environment(\.libraryStore, InMemoryLibraryStore.preview)
}
