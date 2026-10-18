import Testing
@testable import Bingeki

/// Pure event/policy tests; spoken output and actual focus require device qualification.
@MainActor
struct AccessibilityFeedbackTests {
    @Test func eachToastIsAnnouncedOnceEvenWhenTextRepeats() {
        var announcements: [String] = []
        let center = ToastCenter { announcements.append($0) }

        center.show("Titre ajouté")
        let firstID = center.current?.id
        center.show("Titre ajouté")

        #expect(announcements == ["Titre ajouté", "Titre ajouté"])
        #expect(center.current?.id != firstID)
        center.undo()
        #expect(announcements.count == 2)
    }

    @Test func errorToastIsIdentifiedInTheAnnouncement() {
        var announcements: [String] = []
        let center = ToastCenter { announcements.append($0) }

        center.show("Synchronisation impossible", isError: true)

        #expect(announcements == ["Erreur : Synchronisation impossible"])
        #expect(center.current?.isError == true)
        center.undo()
    }

    @Test func undoIsAnnouncedAndRemainsAvailable() {
        var announcements: [String] = []
        var undoCount = 0
        let center = ToastCenter { announcements.append($0) }

        center.show("Titre ajouté", undo: { undoCount += 1 })

        #expect(announcements == ["Titre ajouté. Annuler disponible."])
        #expect(center.current?.undoAction != nil)
        center.undo()
        #expect(undoCount == 1)
        #expect(center.current == nil)
    }

    @Test func replacingAToastDoesNotKeepThePreviousUndo() {
        var undoCount = 0
        let center = ToastCenter { _ in }
        center.show("Ajout", undo: { undoCount += 1 })
        center.show("Autre confirmation")

        center.undo()

        #expect(undoCount == 0)
        #expect(center.current == nil)
    }

    @Test func voiceOverPreventsAutomaticDismissalButAllowsExplicitDismissal() {
        var state = BKLevelUpOverlay.DismissalState()

        #expect(!state.request(automatically: true, voiceOverEnabled: true))
        #expect(!state.isDismissed)
        #expect(state.request(automatically: false, voiceOverEnabled: true))
        #expect(state.isDismissed)
    }

    @Test func normalAutomaticDismissalIsPreserved() {
        var state = BKLevelUpOverlay.DismissalState()

        #expect(state.request(automatically: true, voiceOverEnabled: false))
        #expect(state.isDismissed)
    }

    @Test func cancelledTimerCannotDismissAfterDisappearanceOrVoiceOverChange() {
        var state = BKLevelUpOverlay.DismissalState()

        #expect(!state.request(automatically: true, voiceOverEnabled: false, isCancelled: true))
        #expect(!state.isDismissed)
        #expect(!state.request(automatically: true, voiceOverEnabled: true))
        #expect(state.request(automatically: false, voiceOverEnabled: true))
    }

    @Test func dismissalRunsOnlyOnce() {
        var state = BKLevelUpOverlay.DismissalState()

        #expect(state.request(automatically: false, voiceOverEnabled: false))
        #expect(!state.request(automatically: true, voiceOverEnabled: false))
        #expect(!state.request(automatically: false, voiceOverEnabled: true))
    }
}
