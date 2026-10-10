import SwiftUI
import UIKit

/// Launch intro, "l'éclair d'abord": built from the vector mark
/// (`BKLogoShapes.swift`).
///
/// LaunchScreen.storyboard is plain black, the first frame here. A red
/// lightning bolt zigzags down to the centre, the screen flashes and shakes,
/// the sparks burst out then gather along the outline of the B, the light
/// background opens in a circle from the impact, the B fills in, the logo's
/// bolt slams down and the "BINGEKI" tag stamps. Once `isReady` (and the
/// intro has played), the logo dives into the camera and `onFinished` lets
/// `RootView` remove it.
///
/// Everything is a pure function of `t`, the time actually on screen (see
/// `VisibleClock`), so a slow start-up never skips part of the animation.
struct BKSplashView: View {
    var isReady = false
    var onFinished: () -> Void = {}

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var clock = VisibleClock()
    @State private var exitAt: TimeInterval?
    @State private var finished = false
    @State private var hapticsPlayed = 0

    static let boltRed = Color(red: 0.898, green: 0.118, blue: 0.165)
    private static let logoWidth: CGFloat = 150
    private static var logoSize: CGSize { CGSize(width: logoWidth, height: logoWidth / BKLogo.aspectRatio) }
    private static let minimumShown = 2.2
    private static let exitDuration = 0.5
    /// Points along the B outline the sparks gather on (logo-local coordinates).
    private static let sparkTargets: [CGPoint] = {
        let path = BKLogoInk().path(in: CGRect(origin: .zero, size: logoSize))
        let count = 170
        return (0..<count).map { path.trimmedPath(from: 0, to: max(0.0005, Double($0) / Double(count))).currentPoint ?? .zero }
    }()

    var body: some View {
        TimelineView(.animation) { context in
            let t = reduceMotion ? 3 : clock.tick(context.date)
            let exit = exitAt.map { min(max((t - $0) / Self.exitDuration, 0), 1) } ?? 0
            GeometryReader { proxy in
                let center = CGPoint(x: proxy.size.width / 2, y: proxy.size.height * 0.47)
                ZStack {
                    Color.black
                    lightBackground(t, center: center)
                    lightning(t, center: center)
                    sparks(t, center: center)
                    logo(t, exit: exit)
                        .position(center)
                    tag(t, exit: exit)
                        .position(x: center.x, y: center.y + Self.logoSize.height / 2 + 34)
                    Color.white.opacity(flash(t))
                }
                .offset(shake(t))
                .opacity(1 - ease(exit, from: 0.6, to: 1))
            }
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isReady ? "Bingeki, prêt" : "Bingeki, chargement")
        .onChange(of: clock.seconds) { _, seconds in advance(seconds) }
        .onChange(of: isReady) { _, _ in advance(clock.seconds) }
        .onAppear {
            _ = Self.sparkTargets   // sample the outline now, not mid-animation
            if reduceMotion { advance(3) }
        }
    }

    // MARK: - Timing

    private func advance(_ clockSeconds: TimeInterval) {
        let seconds = clockSeconds
        if !reduceMotion {
            // Haptic thud with the lightning, a lighter one with the logo's bolt.
            if hapticsPlayed == 0, seconds >= 0.42 {
                hapticsPlayed = 1
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            } else if hapticsPlayed == 1, seconds >= 1.5 {
                hapticsPlayed = 2
                UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
            }
        }
        let shown = reduceMotion ? Self.minimumShown : seconds
        if exitAt == nil, shown >= Self.minimumShown, isReady || shown >= 6 {
            exitAt = seconds
        }
        if let exitAt, !finished, reduceMotion || seconds - exitAt >= Self.exitDuration * 0.9 {
            finished = true
            onFinished()
        }
    }

    // MARK: - Curves

    private func spring(_ t: TimeInterval, _ delay: TimeInterval, freq: Double = 2.2, damping: Double = 0.6) -> Double {
        let x = t - delay
        guard x > 0 else { return 0 }
        let w = 2 * .pi * freq, wd = w * sqrt(1 - damping * damping)
        return 1 - exp(-damping * w * x) * (cos(wd * x) + damping * w / wd * sin(wd * x))
    }

    private func ease(_ t: TimeInterval, from a: TimeInterval, to b: TimeInterval) -> Double {
        let k = min(max((t - a) / (b - a), 0), 1)
        return k * k * (3 - 2 * k)
    }

    private func inOut(_ t: TimeInterval, from a: TimeInterval, to b: TimeInterval) -> Double {
        let k = min(max((t - a) / (b - a), 0), 1)
        return k < 0.5 ? 4 * k * k * k : 1 - pow(-2 * k + 2, 3) / 2
    }

    private func bump(_ x: Double, up: Double = 0.03, down: Double = 0.2) -> Double {
        x < 0 ? 0 : x < up ? x / up : max(0, 1 - (x - up) / down)
    }

    private func flash(_ t: TimeInterval) -> Double { 0.95 * bump(t - 0.42, up: 0.02, down: 0.22) }

    private func shake(_ t: TimeInterval) -> CGSize {
        func one(_ at: Double, _ amp: Double, _ dur: Double) -> CGSize {
            let k = t - at
            guard k > 0, k < dur else { return .zero }
            let a = amp * (1 - k / dur)
            return CGSize(width: a * sin(k * 95), height: a * cos(k * 77))
        }
        let a = one(0.42, 12, 0.35), b = one(1.5, 7, 0.25)
        return CGSize(width: a.width + b.width, height: a.height + b.height)
    }

    // MARK: - Layers

    /// App background with pink halftone, opening in a circle from the impact.
    private func lightBackground(_ t: TimeInterval, center: CGPoint) -> some View {
        let radius = 1100 * inOut(t, from: 1.0, to: 1.55)
        return ZStack {
            Color("BGColor")
            Canvas { context, size in
                let spacing: CGFloat = 15
                var y: CGFloat = 0
                while y < size.height {
                    var x: CGFloat = 0
                    while x < size.width {
                        context.fill(Path(ellipseIn: CGRect(x: x, y: y, width: 3.4, height: 3.4)),
                                     with: .color(BKColor.brandPink.opacity(0.22)))
                        x += spacing
                    }
                    y += spacing
                }
            }
        }
        .mask(Circle().frame(width: radius * 2, height: radius * 2).position(center))
    }

    /// The zigzag strike, drawn top to bottom, then flickering out.
    private func lightning(_ t: TimeInterval, center: CGPoint) -> some View {
        let points: [CGPoint] = [CGPoint(x: 55, y: -440), CGPoint(x: 10, y: -290), CGPoint(x: 50, y: -260),
                                 CGPoint(x: -15, y: -130), CGPoint(x: 33, y: -110), CGPoint(x: 0, y: 0)]
            .map { CGPoint(x: center.x + $0.x, y: center.y + $0.y) }
        let bolt = Path { path in path.addLines(points) }.trimmedPath(from: 0, to: ease(t, from: 0.12, to: 0.42))
        let flicker: Double = t < 0.42 ? 1 : (t < 0.75 ? (sin(t * 90) > 0 ? 1 : 0.6) * (1 - ease(t, from: 0.55, to: 0.75)) : 0)
        let style = { (width: CGFloat) in StrokeStyle(lineWidth: width, lineCap: .square, lineJoin: .miter) }
        return ZStack {
            bolt.stroke(BKColor.brandPink.opacity(0.45), style: style(22)).blur(radius: 8)
            bolt.stroke(Self.boltRed, style: style(10))
            bolt.stroke(Color.white, style: style(3.5))
        }
        .opacity(flicker)
    }

    /// Sparks burst from the impact, then gather on the outline of the B.
    private func sparks(_ t: TimeInterval, center: CGPoint) -> some View {
        Canvas { context, _ in
            guard t >= 0.44 else { return }
            let fade = 1 - ease(t, from: 1.12, to: 1.35)
            guard fade > 0 else { return }
            let color: Color = t < 1.0 ? .white : BKColor.brandPink
            let origin = CGPoint(x: center.x - Self.logoSize.width / 2, y: center.y - Self.logoSize.height / 2)
            let out = ease(t, from: 0.44, to: 0.7)
            for (i, target) in Self.sparkTargets.enumerated() {
                let angle = Double(i) * 2.399, radius = 70 + Double(i * 53 % 190)
                let burstX = center.x + cos(angle) * radius, burstY = center.y + sin(angle) * radius * 1.1
                let delay = Double(i % 17) * 0.012
                let back = inOut(t, from: 0.72 + delay, to: 1.12 + delay)
                let fromX = center.x + (burstX - center.x) * out, fromY = center.y + (burstY - center.y) * out
                let x = fromX + (origin.x + target.x - fromX) * back
                let y = fromY + (origin.y + target.y - fromY) * back
                context.fill(Path(ellipseIn: CGRect(x: x - 5, y: y - 5, width: 10, height: 10)), with: .color(color.opacity(0.25 * fade)))
                context.fill(Path(ellipseIn: CGRect(x: x - 2.5, y: y - 2.5, width: 5, height: 5)), with: .color(color.opacity(fade)))
            }
        }
        .allowsHitTesting(false)
    }

    private func logo(_ t: TimeInterval, exit: Double) -> some View {
        let fill = ease(t, from: 1.1, to: 1.32)
        let drop = spring(t, 1.38, freq: 3.4, damping: 0.45)
        let impact = 1 + 0.07 * bump(t - 1.5, up: 0.05, down: 0.25)
        let dive = 1 + 9 * pow(exit, 2.4)
        return ZStack {
            BKLogoInk().fill(BKColor.textPrimary, style: FillStyle(eoFill: true)).opacity(fill)
            BKLogoBolt()
                .fill(Self.boltRed, style: FillStyle(eoFill: true))
                .offset(x: 60 * (1 - drop), y: -420 * (1 - drop))
                .opacity(t > 1.38 ? 1 : 0)
        }
        .frame(width: Self.logoSize.width, height: Self.logoSize.height)
        .scaleEffect(impact * dive)
    }

    private func tag(_ t: TimeInterval, exit: Double) -> some View {
        let start = 1.75
        let k = spring(t, start, freq: 2.8, damping: 0.45)
        return Text("BINGEKI")
            .font(BKFont.display(30))
            .fixedSize()
            .padding(.horizontal, BKSpace.md).padding(.vertical, BKSpace.xs)
            .background(BKColor.textPrimary)
            .foregroundStyle(BKColor.background)
            .background(Rectangle().fill(BKColor.brandPink).offset(x: 5, y: 5))
            .rotationEffect(.degrees(-3))
            .scaleEffect(1.9 - 0.9 * k)
            .opacity(t > start ? min(k * 2, 1) * (1 - ease(exit, from: 0, to: 0.4)) : 0)
    }
}

/// Elapsed time that skips stalls: a gap between two frames longer than
/// 0.15 s is not counted, and it starts on the third smooth frame. Mutated
/// while rendering on purpose; `seconds` is mirrored for `onChange`.
@MainActor
@Observable
private final class VisibleClock {
    /// Visible seconds, rounded to 0.05 s to limit `onChange` traffic.
    private(set) var seconds: TimeInterval = 0
    @ObservationIgnored private var last: Date?
    @ObservationIgnored private var elapsed: TimeInterval = 0
    @ObservationIgnored private var smoothFrames = 0

    func tick(_ now: Date) -> TimeInterval {
        defer { last = now }
        guard let last else { return 0 }
        let gap = now.timeIntervalSince(last)
        guard gap > 0, gap < 0.15 else { smoothFrames = 0; return elapsed }
        smoothFrames += 1
        guard smoothFrames >= 3 else { return elapsed }
        // A slow frame slows the animation down instead of skipping ahead.
        elapsed += min(gap, 1.0 / 30)
        let rounded = (elapsed * 20).rounded(.down) / 20
        if rounded != seconds {
            Task { @MainActor in self.seconds = rounded }
        }
        return elapsed
    }
}

#Preview {
    BKSplashView(isReady: true)
}
