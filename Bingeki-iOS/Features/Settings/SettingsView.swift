import SwiftUI

/// Réglages — theme, privacy, content, notifications, account (board
/// `S13-Settings`). Most toggles are local `@AppStorage` placeholders until
/// they're wired to Firestore/`UserProfile` in Phase 1.
struct SettingsView: View {
    @Environment(InMemoryAuthStore.self) private var auth
    @AppStorage("bk.themePreference") private var themePreference = ThemePreference.system.rawValue
    @AppStorage("bk.showActivityStatus") private var showActivityStatus = true
    @AppStorage("bk.hideScores") private var hideScores = false
    @AppStorage("bk.dataSaver") private var dataSaver = false
    @AppStorage("bk.nsfwMode") private var nsfwMode = false
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
                Picker("Qui voit mon profil", selection: .constant("public")) {
                    Text("Public").tag("public")
                    Text("Amis").tag("friends")
                    Text("Privé").tag("private")
                }
                Toggle("Afficher mon activité", isOn: $showActivityStatus)
                Toggle("Masquer mes notes", isOn: $hideScores)
            }

            Section("Contenu") {
                Toggle("Économie de données", isOn: $dataSaver)
                Toggle("Contenu 18+", isOn: $nsfwMode)
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
}

#Preview {
    NavigationStack { SettingsView() }
        .environment(InMemoryAuthStore(isSignedIn: true))
}
