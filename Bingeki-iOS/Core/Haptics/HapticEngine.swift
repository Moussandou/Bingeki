import UIKit

/// Maps every UI moment to a haptic, per the Micro-interactions board.
/// Centralized so a future "reduce haptics" setting can mute it in one place.
@MainActor
enum HapticEngine {
    private static let impactLight = UIImpactFeedbackGenerator(style: .light)
    private static let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private static let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private static let selection = UISelectionFeedbackGenerator()
    private static let notification = UINotificationFeedbackGenerator()

    /// `+1` on progress.
    static func progressTick() { impactLight.impactOccurred() }
    /// Add to library, swipe decision.
    static func added() { impactMedium.impactOccurred() }
    /// Long-press reaching the status picker.
    static func longPressActivated() { impactHeavy.impactOccurred() }
    /// Slider crossing a chapter/episode notch.
    static func sliderNotch() { selection.selectionChanged() }
    /// Series finished, level up.
    static func success() { notification.notificationOccurred(.success) }
    /// Failed network call, invalid input.
    static func failure() { notification.notificationOccurred(.error) }
}
