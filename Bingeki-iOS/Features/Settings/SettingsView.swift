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

    var body: some View {
        Form {
            Section("Apparence") {
                Picker("Thème", selection: $themePreference) {
                    ForEach(ThemePreference.allCases, id: \.self) { Text($0.label).tag($0.rawValue) }
                }
                // FR only until the String Catalog lands (EN planned V1.1, §12).
                LabeledContent("Langue", value: "Français")
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
                LabeledContent("Connecté avec", value: auth.accountLabel)
                Link("Ouvrir Bingeki sur le web", destination: URL(string: "https://bingeki.web.app")!)
                Button("Se déconnecter", role: .destructive) { try? auth.signOut() }
            }

            Section {
                Button("Supprimer mon compte", role: .destructive) { confirmingDeletion = true }
                    .disabled(isDeleting)
                    // Attached to the button so the iOS 27 popover points at it.
                    .confirmationDialog("Supprimer ton compte ?", isPresented: $confirmingDeletion, titleVisibility: .visible) {
                        Button("Supprimer définitivement", role: .destructive) { deleteAccount() }
                    } message: {
                        Text("Cette action est irréversible.")
                    }
            } footer: {
                Text("Supprime définitivement ton profil, ta bibliothèque et ta progression, sur l'app et sur le web.")
            }
        }
        .navigationTitle("Réglages")
        // A pushed Form doesn't inherit `bkTabPage()`'s bottom inset, so the
        // last rows would sit under the floating BKTabBar.
        .contentMargins(.bottom, BKSize.tabBarHeight + BKSpace.lg, for: .scrollContent)
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
