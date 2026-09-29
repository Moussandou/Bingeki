import SwiftUI

/// Réglages — theme, privacy, content, notifications, account (board
/// `S13-Settings`). Privacy/content toggles bind straight to `UserProfile`
/// (they're server fields once Firestore lands); theme, language and
/// notification permissions are device-local, so `@AppStorage` is correct
/// for those.
struct SettingsView: View {
    @Environment(InMemoryAuthStore.self) private var auth
    @Environment(InMemoryUserStore.self) private var userStore
    @AppStorage("bk.themePreference") private var themePreference = ThemePreference.system.rawValue
    @AppStorage("bk.episodeNotifications") private var episodeNotifications = true
    @AppStorage("bk.streakReminders") private var streakReminders = true

    var body: some View {
        Form {
            Section("Apparence") {
                Picker("Thème", selection: $themePreference) {
                    ForEach(ThemePreference.allCases, id: \.self) { Text($0.label).tag($0.rawValue) }
                }
                NavigationLink("Langue") { Text("Français") }
            }

            Section("Confidentialité") {
                Picker(
                    "Qui voit mon profil",
                    selection: Binding(
                        get: { userStore.profile.profileVisibility },
                        set: { visibility in userStore.update { $0.profileVisibility = visibility } }
                    )
                ) {
                    ForEach(ProfileVisibility.allCases, id: \.self) { Text($0.label).tag($0) }
                }
                Toggle("Afficher mon activité", isOn: profileBinding(\.showActivityStatus))
                Toggle("Masquer mes notes", isOn: profileBinding(\.hideScores))
            }

            Section("Contenu") {
                Toggle("Économie de données", isOn: profileBinding(\.dataSaver))
                Toggle("Contenu 18+", isOn: profileBinding(\.nsfwMode))
            }

            Section("Notifications") {
                Toggle("Nouvel épisode / chapitre", isOn: $episodeNotifications)
                Toggle("Rappel de série (streak)", isOn: $streakReminders)
            }

            Section("Compte") {
                Label("Apple · connecté", systemImage: "applelogo")
                Button("Ouvrir Bingeki sur le web") {}
                Button("Se déconnecter", role: .destructive) { auth.signOut() }
            }
        }
        .navigationTitle("Réglages")
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

    /// `nil` defers to the system setting. AMOLED reuses the dark palette
    /// for now — a true true-black variant is a design-token follow-up, not
    /// wired yet (see the handoff doc's Phase 4 notes).
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
        .environment(InMemoryAuthStore(isSignedIn: true))
        .environment(InMemoryUserStore.preview)
}
