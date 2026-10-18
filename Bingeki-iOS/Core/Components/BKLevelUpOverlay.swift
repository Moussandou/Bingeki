import SwiftUI

/// Full-screen "moment de marque" — speedlines + stamp, 1.6s, closes itself.
/// Mirrors state #12 on the mockup canvas. Never triggered mid-gesture:
/// `InMemoryUserStore.addXP` only sets it between discrete actions (a tap,
/// not a drag), so it can't interrupt a swipe.
struct BKLevelUpOverlay: View {
    let level: Int
    let onDismiss: () -> Void

    @State private var appeared = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            BKColor.background.opacity(0.98).ignoresSafeArea()
            // §6.3: with Reduce Motion, no speedlines, no stamp spring —
            // a plain 150 ms fade instead.
            if !reduceMotion {
                SpeedlinesView()
                    .opacity(0.15)
                    .ignoresSafeArea()
            }

            VStack(spacing: BKSpace.lg) {
                ZStack {
                    Circle().fill(BKColor.brandPink).frame(width: 150, height: 150)
                        .shadow(color: BKColor.brandPink.opacity(0.6), radius: 30)
                    Text("\(level)").font(BKFont.display(64)).foregroundStyle(.white)
                }
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
            .scaleEffect(appeared || reduceMotion ? 1 : 0.6)
            .opacity(appeared ? 1 : 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Niveau supérieur, niveau \(level)")
        .onAppear {
            withAnimation(reduceMotion
                ? .easeOut(duration: 0.15)
                : .interpolatingSpring(stiffness: 220, damping: 14)) { appeared = true }
            HapticEngine.success()
            Task {
                try? await Task.sleep(for: .seconds(1.6))
                onDismiss()
            }
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
