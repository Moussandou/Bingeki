import Observation
import SwiftUI

@MainActor
@Observable
final class CatalogueCacheSettingsModel {
    enum Action { case measure, purge }

    private let cache: (any CatalogueCacheManaging)?
    private(set) var statistics: ResponseCache.Statistics?
    private(set) var isBusy = false
    private(set) var didPurge = false
    private(set) var errorMessage: String?
    private(set) var failedAction: Action?

    init(cache: (any CatalogueCacheManaging)? = ResponseCache.shared) {
        self.cache = cache
    }

    func perform(_ action: Action) async {
        guard !isBusy else { return }
        isBusy = true
        statistics = nil
        didPurge = false
        errorMessage = nil
        failedAction = nil
        defer { isBusy = false }

        guard let cache else {
            errorMessage = "Le stockage du cache catalogue est indisponible."
            failedAction = .measure
            return
        }

        var retryAction = action
        do {
            if action == .purge {
                try await cache.purge()
                didPurge = true
                // If inspection fails after deletion, retry inspection, not deletion.
                retryAction = .measure
            }
            statistics = try await cache.statistics()
        } catch {
            failedAction = retryAction
            errorMessage = error.localizedDescription
        }
    }
}

struct CatalogueCacheSection: View {
    @State private var model = CatalogueCacheSettingsModel()
    @State private var confirmingPurge = false

    var body: some View {
        VStack(alignment: .leading, spacing: BKSpace.md) {
            Text("Réponses du catalogue conservées pour une consultation hors ligne. Les images et l’espace disque SQLite ne sont pas comptés.")
                .font(.caption)
                .foregroundStyle(BKColor.textSecondary)

            if model.isBusy {
                ProgressView("Opération sur le cache catalogue…")
                    .accessibilityIdentifier("catalogue_cache_loading")
            }

            if let statistics = model.statistics {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Payloads : \(statistics.payloadCount.formatted())")
                    Text("Octets des payloads : \(statistics.payloadBytes.formatted())")
                }
                .font(.subheadline)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("catalogue_cache_statistics")
            }

            if model.didPurge {
                Text("Cache catalogue vidé. Il se remplira lors des prochaines consultations en ligne.")
                    .font(.subheadline)
                    .accessibilityIdentifier("catalogue_cache_success")
            }

            if let error = model.errorMessage {
                Text("Erreur du cache catalogue : \(error)")
                    .font(.subheadline)
                    .foregroundStyle(BKColor.accentText)
                    .accessibilityIdentifier("catalogue_cache_error")
                Button("Réessayer") {
                    if model.failedAction == .purge {
                        confirmingPurge = true
                    } else {
                        Task { await model.perform(.measure) }
                    }
                }
                .frame(minHeight: BKSize.minTapTarget)
                .accessibilityIdentifier("catalogue_cache_retry")
            }

            Button("Actualiser la mesure") {
                Task { await model.perform(.measure) }
            }
            .frame(minHeight: BKSize.minTapTarget)
            .accessibilityIdentifier("catalogue_cache_refresh")

            Button("Vider le cache catalogue", role: .destructive) {
                confirmingPurge = true
            }
            .frame(minHeight: BKSize.minTapTarget)
            .accessibilityIdentifier("catalogue_cache_purge")
            .confirmationDialog(
                "Vider le cache catalogue ?",
                isPresented: $confirmingPurge,
                titleVisibility: .visible
            ) {
                Button("Vider le cache catalogue", role: .destructive) {
                    Task { await model.perform(.purge) }
                }
                Button("Annuler", role: .cancel) {}
            } message: {
                Text("Seules les réponses du catalogue seront supprimées. Ta bibliothèque, ton profil et tes modifications en attente restent intacts. Sans réseau, les réponses supprimées ne seront plus disponibles.")
            }

            Text("Aucune donnée utilisateur, image ou donnée Firestore n’est supprimée.")
                .font(.caption)
                .foregroundStyle(BKColor.textSecondary)
        }
        .buttonStyle(.plain)
        .foregroundStyle(BKColor.textPrimary)
        .disabled(model.isBusy)
        .padding(14)
        .task { await model.perform(.measure) }
    }
}
