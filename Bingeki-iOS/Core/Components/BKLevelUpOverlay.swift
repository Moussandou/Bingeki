import SwiftUI
import UIKit

/// Full-screen "moment de marque" — speedlines + stamp, 1.6s outside VoiceOver.
/// Mirrors state #12 on the mockup canvas. Never triggered mid-gesture:
/// `InMemoryUserStore.addXP` only sets it between discrete actions (a tap,
/// not a drag), so it can't interrupt a swipe.
struct BKLevelUpOverlay: View {
    let level: Int
    let onDismiss: () -> Void

    @State private var appeared = false
    @State private var voiceOverEnabled = UIAccessibility.isVoiceOverRunning
    @State private var dismissal = DismissalState()
    @AccessibilityFocusState(for: .voiceOver) private var headingFocused: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    struct DismissalState {
        private(set) var isDismissed = false

        mutating func request(automatically: Bool, voiceOverEnabled: Bool, isCancelled: Bool = false) -> Bool {
            guard !isDismissed, !isCancelled, !automatically || !voiceOverEnabled else { return false }
            isDismissed = true
            return true
        }
    }

    private struct PresentationID: Hashable {
        let level: Int
        let voiceOverEnabled: Bool
    }

    var body: some View {
        ZStack {
            BKColor.background.opacity(0.98).ignoresSafeArea()
            // §6.3: with Reduce Motion, no speedlines, no stamp spring —
            // a plain 150 ms fade instead.
            if !reduceMotion {
                SpeedlinesView()
                    .opacity(0.15)
                    .ignoresSafeArea()
                    .accessibilityHidden(true)
            }

            VStack(spacing: BKSpace.lg) {
                ZStack {
                    Circle().fill(BKColor.brandPink).frame(width: 150, height: 150)
                        .shadow(color: BKColor.brandPink.opacity(0.6), radius: 30)
                    Text("\(level)").font(BKFont.display(64)).foregroundStyle(.white)
                }
                .accessibilityHidden(true)
                VStack(spacing: BKSpace.lg) {
                    Text("NIVEAU \(level)")
                        .font(BKFont.display(36))
                        .padding(.horizontal, BKSpace.lg).padding(.vertical, 4)
                        .background(BKColor.textPrimary)
                        .foregroundStyle(BKColor.background)
                        .rotationEffect(.degrees(reduceMotion ? 0 : -2))
                    Text("Rang \(GamificationCore.rank(forLevel: level))")
                        .font(.subheadline)
                        .foregroundStyle(BKColor.textSecondary)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Niveau supérieur, niveau \(level), rang \(GamificationCore.rank(forLevel: level))")
                .accessibilityAddTraits(.isHeader)
                .accessibilityFocused($headingFocused)

                if voiceOverEnabled {
                    Button("Continuer") { dismiss(automatically: false) }
                        .font(.body.weight(.semibold))
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("level_up_continue")
                }
            }
            .scaleEffect(appeared || reduceMotion ? 1 : 0.6)
            .opacity(appeared ? 1 : 0)
        }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .accessibilityAction(.escape) { dismiss(automatically: false) }
        .onReceive(NotificationCenter.default.publisher(for: UIAccessibility.voiceOverStatusDidChangeNotification)) { _ in
            voiceOverEnabled = UIAccessibility.isVoiceOverRunning
        }
        .onChange(of: level) {
            dismissal = DismissalState()
        }
        .task(id: PresentationID(level: level, voiceOverEnabled: voiceOverEnabled)) {
            headingFocused = voiceOverEnabled
            guard !voiceOverEnabled else { return }
            try? await Task.sleep(for: .seconds(1.6))
            dismiss(automatically: true, isCancelled: Task.isCancelled)
        }
        .onAppear {
            withAnimation(reduceMotion
                ? .easeOut(duration: 0.15)
                : .interpolatingSpring(stiffness: 220, damping: 14)) { appeared = true }
            HapticEngine.success()
        }
    }

    private func dismiss(automatically: Bool, isCancelled: Bool = false) {
        if dismissal.request(
            automatically: automatically,
            voiceOverEnabled: UIAccessibility.isVoiceOverRunning,
            isCancelled: isCancelled
        ) {
            onDismiss()
        }
    }
}

/// Manga speedlines — a conic sweep of thin radial wedges, matching
/// `.manga-speedlines` on the web.
private struct SpeedlinesView: View {
    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let radius = max(size.width, size.height)
            let wedgeCount = 60
            for i in 0..<wedgeCount where i % 2 == 0 {
                let start = Double(i) / Double(wedgeCount) * 2 * .pi
                let end = start + (2 * .pi / Double(wedgeCount)) * 0.6
                var path = Path()
                path.move(to: center)
                path.addArc(center: center, radius: radius, startAngle: .radians(start), endAngle: .radians(end), clockwise: false)
                path.closeSubpath()
                context.fill(path, with: .color(BKColor.textPrimary))
            }
        }
    }
}

#Preview {
    BKLevelUpOverlay(level: 15) {}
}
