import SwiftUI

/// Launch intro built from the vector mark (`BKLogoShapes.swift`).
///
/// LaunchScreen.storyboard shows `SplashLogo`, rendered from the same
/// shapes at the same size and centred, so this view's first frame is
/// identical and the hand-off is invisible. From there the bolt recoils and
/// strikes back down, the B jolts on impact and the "BINGEKI" tag stamps.
/// `RootView` zooms the whole thing out once the library is ready.
struct BKSplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var recoil = false
    @State private var impact = false
    @State private var tagIn = false
    @State private var ringShown = false
    @State private var ringExpanded = false

    static let boltRed = Color(red: 0.898, green: 0.118, blue: 0.165)
    static let markHeight: CGFloat = 132

    var body: some View {
        ZStack {
            Color("BGColor").ignoresSafeArea()
            mark
                // The mark stays dead centre like the launch image; the tag
                // hangs below without pushing it.
                .overlay(alignment: .bottom) {
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
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Bingeki, chargement")
        .onAppear(perform: play)
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

    private func play() {
        guard !reduceMotion else {
            withAnimation(.easeOut(duration: 0.2).delay(0.1)) { tagIn = true }
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
    }
}

#Preview {
    BKSplashView()
}
