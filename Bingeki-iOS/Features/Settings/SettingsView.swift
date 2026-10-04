import SwiftUI

/// Réglages — theme, privacy, content, notifications, account (board
/// `S13-Settings`). Privacy/content toggles bind straight to `UserProfile`
/// (they're server fields once Firestore lands); theme, language and
/// notification permissions are device-local, so `@AppStorage` is correct
/// for those.
struct SettingsView: View {
    @Environment(\.authStore) private var auth
    @Environment(\.userStore) private var userStore
    @AppStorage("bk.themePreference") private var themePreference = ThemePreference.system.rawValue
    @AppStorage("bk.episodeNotifications") private var episodeNotifications = true
    @AppStorage("bk.streakReminders") private var streakReminders = true
    @State private var confirmingDeletion = false
    @State private var isDeleting = false
    @State private var deletionError: String?

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                header

                group("Apparence") {
                    SettingRow(title: "Thème", divider: false)
                    BKSegmented(
                        options: ThemePreference.allCases,
                        selection: Binding(
                            get: { ThemePreference(rawValue: themePreference) ?? .system },
                            set: { themePreference = $0.rawValue }
                        ),
                        label: \.label
                    )
                    // FR only until the String Catalog lands (EN planned V1.1, §12).
                    SettingRow(title: "Langue", value: "Français", divider: false)
                }

                group("Confidentialité") {
                    SettingRow(title: "Qui voit mon profil", subtitle: "Licence, biblio et stats", divider: false)
                    BKSegmented(
                        options: ProfileVisibility.allCases,
                        selection: Binding(
                            get: { userStore.profile.profileVisibility },
                            set: { visibility in userStore.update { $0.profileVisibility = visibility } }
                        ),
                        label: \.label
                    )
                    SettingToggle(title: "Afficher mon activité", subtitle: "« Vu il y a 5 min », en cours de lecture",
                                  isOn: profileBinding(\.showActivityStatus))
                    SettingToggle(title: "Masquer mes notes", subtitle: "Tes /10 restent visibles pour toi seul",
                                  isOn: profileBinding(\.hideScores), divider: false)
                }

                group("Contenu") {
                    SettingToggle(title: "Économie de données", subtitle: "Couvertures basse définition, pas de trailer auto",
                                  isOn: profileBinding(\.dataSaver))
                    SettingToggle(title: "Contenu 18+", subtitle: "Nécessite une confirmation d'âge",
                                  isOn: profileBinding(\.nsfwMode), divider: false)
                }

                group("Notifications") {
                    SettingToggle(title: "Nouvel épisode / chapitre", subtitle: "Pour tes titres « En cours »",
                                  isOn: $episodeNotifications)
                    SettingToggle(title: "Rappel de série (streak)", isOn: $streakReminders, divider: false)
                }

                group("Compte") {
                    SettingRow(title: "Compte & synchro", value: auth.accountLabel)
                    Link(destination: URL(string: "https://bingeki.web.app")!) {
                        SettingRow(title: "Ouvrir Bingeki sur le web", trailingIcon: "arrow.up.right")
                    }
                    Button { try? auth.signOut() } label: { SettingRow(title: "Se déconnecter") }
                    Button { confirmingDeletion = true } label: {
                        SettingRow(title: "Supprimer mon compte", tint: BKColor.accentText, divider: false)
                    }
                    .disabled(isDeleting)
                    // Attached to the button so the iOS 27 popover points at it.
                    .confirmationDialog("Supprimer ton compte ?", isPresented: $confirmingDeletion, titleVisibility: .visible) {
                        Button("Supprimer définitivement", role: .destructive) { deleteAccount() }
                    } message: {
                        Text("Cette action est irréversible.")
                    }
                }
                .buttonStyle(.plain)

                Text("Supprimer ton compte efface ton profil, ta bibliothèque et ta progression, sur l'app et sur le web.")
                    .font(.caption)
                    .foregroundStyle(BKColor.textSecondary)
                    .padding(.horizontal, 4)
                    .padding(.top, BKSpace.xs)
            }
            .padding(.horizontal, BKSpace.screenMargin)
            .padding(.top, BKSpace.sm)
        }
        .background(BKColor.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        // Pushed views don't inherit `bkTabPage()`'s bottom inset, so the
        // last rows would sit under the floating BKTabBar.
        .contentMargins(.bottom, BKSize.tabBarHeight + BKSpace.xl, for: .scrollContent)
        .alert("Suppression impossible", isPresented: Binding(
            get: { deletionError != nil },
            set: { if !$0 { deletionError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(deletionError ?? "")
        }
        .overlay {
            if isDeleting { ProgressView().controlSize(.large) }
        }
    }

    private var header: some View {
        HStack(spacing: BKSpace.sm) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.heavy))
                    .frame(width: 44, height: 44)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder(BKColor.border)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Retour")
            Text("Réglages").font(BKFont.display(30)).textCase(.uppercase).bkLabelStyle()
            Spacer()
        }
        .padding(.bottom, BKSpace.sm)
    }

    private func group<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(BKFont.display(12, weight: .heavy))
                .tracking(1)
                .textCase(.uppercase)
                .foregroundStyle(BKColor.textSecondary)
                .padding(.horizontal, 4)
                .accessibilityAddTraits(.isHeader)
            VStack(spacing: 0) { content() }
                .background(BKColor.surface)
                .bkInkBorder()
                .bkPanelShadow()
        }
        .padding(.top, BKSpace.sm)
    }

    private func deleteAccount() {
        isDeleting = true
        Task {
            do {
                try await auth.deleteAccount()
            } catch {
                deletionError = "Vérifie ta connexion et réessaie."
            }
            isDeleting = false
        }
    }

    /// A two-way `Binding` into a single `Bool` field of `UserProfile`,
    /// routed through `userStore.update` so every toggle stays a one-liner
    /// above instead of a hand-written getter/setter each.
    private func profileBinding(_ keyPath: WritableKeyPath<UserProfile, Bool>) -> Binding<Bool> {
        Binding(
            get: { userStore.profile[keyPath: keyPath] },
            set: { newValue in userStore.update { $0[keyPath: keyPath] = newValue } }
        )
    }
}

// MARK: - Inked setting rows (board S13)

private struct SettingRow: View {
    let title: String
    var subtitle: String?
    var value: String?
    var trailingIcon: String?
    var tint: Color = BKColor.textPrimary
    var divider = true

    var body: some View {
        HStack(spacing: BKSpace.md) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(tint == BKColor.textPrimary ? .regular : .semibold))
                if let subtitle {
                    Text(subtitle).font(.caption).foregroundStyle(BKColor.textSecondary)
                }
            }
            .foregroundStyle(tint)
            Spacer(minLength: 0)
            if let value {
                Text(value).font(.subheadline).foregroundStyle(BKColor.textSecondary)
            }
            if let trailingIcon {
                Image(systemName: trailingIcon).font(.footnote.weight(.bold)).foregroundStyle(BKColor.textSecondary)
            }
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 56)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            if divider { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
        }
    }
}

private struct SettingToggle: View {
    let title: String
    var subtitle: String?
    @Binding var isOn: Bool
    var divider = true

    var body: some View {
        Button { isOn.toggle(); HapticEngine.progressTick() } label: {
            HStack(spacing: BKSpace.md) {
                SettingRow(title: title, subtitle: subtitle, divider: false)
                    .padding(.trailing, -14)
                BKInkSwitch(isOn: isOn)
            }
            .padding(.trailing, 14)
            .overlay(alignment: .bottom) {
                if divider { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
            }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityHint(subtitle ?? "")
        .accessibilityValue(isOn ? "Activé" : "Désactivé")
        .accessibilityAddTraits(.isToggle)
    }
}

/// Square switch: pink track when on, ink border, no rounding.
private struct BKInkSwitch: View {
    let isOn: Bool

    var body: some View {
        ZStack(alignment: isOn ? .trailing : .leading) {
            Rectangle().fill(isOn ? BKColor.brandPink : BKColor.surfaceTint)
            Rectangle()
                .fill(isOn ? Color.white : BKColor.textSecondary)
                .frame(width: 22, height: 22)
                .padding(3)
        }
        .frame(width: 52, height: 32)
        .overlay(Rectangle().stroke(BKColor.ink, lineWidth: 2))
        .animation(.snappy(duration: 0.15), value: isOn)
    }
}

/// Row of equal inked buttons, the selected one filled pink.
private struct BKSegmented<Option: Hashable>: View {
    let options: [Option]
    @Binding var selection: Option
    let label: KeyPath<Option, String>

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(options.enumerated()), id: \.element) { i, option in
                let isOn = option == selection
                Button { selection = option; HapticEngine.progressTick() } label: {
                    Text(option[keyPath: label])
                        .font(.footnote.weight(isOn ? .heavy : .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .foregroundStyle(isOn ? Color.black : BKColor.textPrimary)
                        .background(isOn ? BKColor.brandPink : BKColor.background)
                        .overlay(alignment: .trailing) {
                            if i < options.count - 1 { Rectangle().fill(BKColor.ink).frame(width: 2) }
                        }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isOn ? .isSelected : [])
            }
        }
        .overlay(Rectangle().stroke(BKColor.ink, lineWidth: 2))
        .padding(.horizontal, 14)
        .padding(.bottom, 14)
    }
}

enum ThemePreference: String, CaseIterable {
    case system, light, dark, amoled

    var label: String {
        switch self {
        case .system: return "Système"
        case .light: return "Clair"
        case .dark: return "Sombre"
        case .amoled: return "AMOLED"
        }
    }

    /// `nil` defers to the system setting. AMOLED is the dark scheme plus
    /// the `\.bkAmoled` environment flag, which turns `BKColor.background`/
    /// `surface` true black.
    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark, .amoled: return .dark
        }
    }
}

#Preview {
    NavigationStack { SettingsView() }
        .environment(\.authStore, InMemoryAuthStore(isSignedIn: true))
        .environment(\.userStore, InMemoryUserStore.preview)
}
