import SwiftUI

/// Launch intro built from the vector mark (`BKLogoShapes.swift`).
///
/// LaunchScreen.storyboard shows `SplashLogo`, rendered from the same
/// shapes at the same size and centred, so this view's first frame is
/// identical and the hand-off is invisible. From there the bolt recoils and
/// strikes, the "BINGEKI" tag stamps, then a loading bar and status line run
/// until `isReady` (the library has loaded), so the screen never sits still.
/// `RootView` fades it out once the bar has filled.
struct BKSplashView: View {
    var isReady = false
    /// Called once the bar has filled, so `RootView` can fade the splash out.
    var onFinished: () -> Void = {}

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var recoil = false
    @State private var impact = false
    @State private var tagIn = false
    @State private var ringShown = false
    @State private var ringExpanded = false
    @State private var loaderIn = false
    @State private var readyAt: Date?
    /// Counts only time actually on screen: app start-up can block the main
    /// thread for a second or more, and wall-clock timers would let the intro
    /// "finish" before it was ever drawn.
    @State private var clock = VisibleClock()
    @State private var finished = false

    static let boltRed = Color(red: 0.898, green: 0.118, blue: 0.165)
    static let markHeight: CGFloat = 132

    var body: some View {
        TimelineView(.animation) { context in
            let t = clock.tick(context.date)
            ZStack {
                Color("BGColor").ignoresSafeArea()
                halftone(t)
                VStack(spacing: 0) {
                    Spacer()
                    mark
                        .scaleEffect(reduceMotion ? 1 : 1 + 0.015 * sin(max(t - 0.9, 0) * 2.6))
                        .overlay(alignment: .bottom) { tag }
                    Spacer()
                }
                loader(t)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 72)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isReady ? "Bingeki, prêt" : "Bingeki, chargement")
        .onChange(of: clock.isRunning) { _, running in if running { play() } }
        .onChange(of: clock.seconds) { _, seconds in advance(seconds) }
    }

    // MARK: - Pieces

    private var tag: some View {
        Text("BINGEKI")
            .font(BKFont.display(30))
            .fixedSize()
            .padding(.horizontal, BKSpace.md).padding(.vertical, BKSpace.xs)
            .background(BKColor.textPrimary)
            .foregroundStyle(BKColor.background)
            .rotationEffect(.degrees(-2))
            .scaleEffect(tagIn ? 1 : 1.8)
            .opacity(tagIn ? 1 : 0)
            .offset(y: 80)
    }

    private var mark: some View {
        ZStack {
            BKLogoInk()
                .fill(BKColor.textPrimary, style: FillStyle(eoFill: true))
                .offset(y: impact ? 4 : 0)
                .rotationEffect(.degrees(impact ? -2 : 0))
            // Impact ring where the bolt lands.
            Circle()
                .stroke(Self.boltRed, lineWidth: 3)
                .frame(width: 70, height: 70)
                .scaleEffect(ringExpanded ? 2.4 : 0.3)
                .opacity(ringShown ? (ringExpanded ? 0 : 0.9) : 0)
                .offset(x: -25, y: 50)
            BKLogoBolt()
                .fill(Self.boltRed, style: FillStyle(eoFill: true))
                .offset(x: recoil ? 18 : 0, y: recoil ? -60 : 0)
                .opacity(recoil ? 0.0 : 1)
        }
        .frame(width: Self.markHeight * BKLogo.aspectRatio, height: Self.markHeight)
    }

    /// Pink dots fading in from the edges once the bolt has landed.
    private func halftone(_ t: TimeInterval) -> some View {
        let shown = reduceMotion ? 1 : min(max((t - 0.3) / 0.6, 0), 1)
        return Canvas { context, size in
            let spacing: CGFloat = 20
            var y: CGFloat = 0, row = 0
            while y < size.height {
                var x: CGFloat = row.isMultiple(of: 2) ? 0 : spacing / 2
                while x < size.width {
                    context.fill(Path(ellipseIn: CGRect(x: x, y: y, width: 3.2, height: 3.2)),
                                 with: .color(BKColor.brandPink.opacity(0.18)))
                    x += spacing
                }
                y += spacing * 0.87
                row += 1
            }
        }
        .mask(RadialGradient(colors: [.clear, .black], center: .center, startRadius: 120, endRadius: 520))
        .opacity(shown)
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }

    /// Inked progress bar: eases towards 85 % while loading, then fills to
    /// the end once the content is ready. Under it, the current step.
    private func loader(_ t: TimeInterval) -> some View {
        let loading = 0.85 * (1 - exp(-max(t - 0.5, 0) / 1.1))
        let progress: Double
        if let readyAt {
            let since = t - readyAt.timeIntervalSinceReferenceDate
            let k = min(max(since / 0.35, 0), 1)
            progress = loading + (1 - loading) * (1 - pow(1 - k, 3))
        } else {
            progress = loading
        }
        let step = readyAt != nil ? "C'est parti !"
            : t < 1.2 ? "Connexion…"
            : t < 2.6 ? "Chargement de ta biblio…"
            : "Presque prêt…"
        return VStack(spacing: 12) {
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Rectangle().fill(BKColor.surface)
                    Rectangle().fill(BKColor.brandPink)
                        .frame(width: max(0, (proxy.size.width - 6) * progress))
                        .overlay(alignment: .trailing) {
                            // Moving highlight so the bar visibly works even when slow.
                            if readyAt == nil && !reduceMotion {
                                LinearGradient(colors: [.white.opacity(0), .white.opacity(0.55), .white.opacity(0)],
                                               startPoint: .leading, endPoint: .trailing)
                                    .frame(width: 40)
                                    .offset(x: -((t * 90).truncatingRemainder(dividingBy: 200)))
                            }
                        }
                        .clipped()
                        .padding(3)
                }
            }
            .frame(width: 200, height: 18)
            .bkInkBorder(BKColor.textPrimary, width: 2.5)
            .bkPanelShadow(BKColor.textPrimary, offset: 3)

            Text(step.uppercased())
                .font(BKFont.display(12, weight: .heavy))
                .tracking(1.2)
                .foregroundStyle(BKColor.textSecondary)
                .contentTransition(.opacity)
                .animation(.easeOut(duration: 0.2), value: step)
        }
        .opacity(loaderIn ? 1 : 0)
        .offset(y: loaderIn ? 0 : 12)
    }

    /// Minimum 1.6 s of visible intro, then wait for the content (at most
    /// 5 s), fill the bar, and hand over.
    private func advance(_ seconds: TimeInterval) {
        if readyAt == nil, seconds >= 1.6, isReady || seconds >= 5 {
            readyAt = Date(timeIntervalSinceReferenceDate: seconds)
        }
        if let readyAt, !finished, seconds - readyAt.timeIntervalSinceReferenceDate >= 0.45 {
            finished = true
            onFinished()
        }
    }

    private func play() {
        guard !reduceMotion else {
            tagIn = true
            loaderIn = true
            return
        }
        // Bolt lifts off (0.12s), slams back (spring), B jolts, tag stamps.
        withAnimation(.easeIn(duration: 0.12)) { recoil = true }
        withAnimation(.spring(response: 0.18, dampingFraction: 0.5).delay(0.14)) { recoil = false }
        withAnimation(.easeOut(duration: 0.08).delay(0.24)) { impact = true }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(240))
            ringShown = true
            withAnimation(.easeOut(duration: 0.45)) { ringExpanded = true }
        }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.4).delay(0.32)) { impact = false }
        withAnimation(.spring(response: 0.25, dampingFraction: 0.5).delay(0.36)) { tagIn = true }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8).delay(0.55)) { loaderIn = true }
    }
}

/// Elapsed time that skips stalls: a gap between two frames longer than
/// 0.15 s is not counted. Starts on the first smooth frame. Mutated during
/// rendering on purpose (reference type, so it doesn't invalidate the view);
/// `isRunning` / `seconds` are mirrored as published values for `onChange`.
@MainActor
@Observable
private final class VisibleClock {
    private(set) var isRunning = false
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
        elapsed += gap
        let rounded = (elapsed * 20).rounded(.down) / 20
        if !isRunning || rounded != seconds {
            Task { @MainActor in
                self.isRunning = true
                self.seconds = rounded
            }
        }
        return elapsed
    }
}

#Preview {
    BKSplashView()
}
