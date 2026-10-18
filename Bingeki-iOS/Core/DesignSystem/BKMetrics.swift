import SwiftUI

/// 4pt spacing grid, radii and touch targets — §6.3 of the handoff doc.
enum BKSpace {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48

    /// Screen edge margin.
    static let screenMargin: CGFloat = 16
    /// Gap between cards in a row/list.
    static let cardGap: CGFloat = 12
    /// Gap between stacked sections.
    static let sectionGap: CGFloat = 32
}

enum BKSize {
    /// Minimum tap target (HIG + §10 accessibility rule).
    static let minTapTarget: CGFloat = 44
    /// Primary CTA height.
    static let ctaHeight: CGFloat = 56
    static let tabBarHeight: CGFloat = 62
}

/// Manga-panel look: hard ink border + solid offset shadow, no soft blur,
/// no rounded corners on content cards (mirrors `.manga-panel` on web).
struct BKPanelShadow: ViewModifier {
    var color: Color = BKColor.ink
    var offset: CGFloat = 4

    func body(content: Content) -> some View {
        content
            .background(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 0)
                    .fill(color)
                    .offset(x: offset, y: offset)
            }
    }
}

extension View {
    /// Applies the flat, offset "manga panel" shadow used across the app
    /// instead of a soft system shadow.
    func bkPanelShadow(_ color: Color = BKColor.ink, offset: CGFloat = 4) -> some View {
        modifier(BKPanelShadow(color: color, offset: offset))
    }

    /// 2pt ink border, matching `.manga-panel` / `.panel` on web.
    func bkInkBorder(_ color: Color = BKColor.ink, width: CGFloat = 2) -> some View {
        overlay(RoundedRectangle(cornerRadius: 0).stroke(color, lineWidth: width))
    }
}
