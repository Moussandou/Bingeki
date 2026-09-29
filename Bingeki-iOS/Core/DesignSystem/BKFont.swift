import SwiftUI

/// Typography — Outfit for display/CTA, Inter for body, mapped onto Dynamic
/// Type styles so the system text-size setting works (§6.2 of the handoff doc).
///
/// Font files are not embedded yet (Phase 0 TODO): drop `Outfit-*.ttf` and
/// `Inter-*.ttf` into `Resources/Fonts`, register them under `UIAppFonts` in
/// Info.plist, then flip `BKFont.useCustomFonts` to `true`. Until then every
/// style falls back to the system font at the same size/weight so the app
/// runs and previews correctly with zero setup.
enum BKFont {
    static let useCustomFonts = false

    private static func named(_ name: String, size: CGFloat, weight: Font.Weight, relativeTo style: Font.TextStyle) -> Font {
        guard useCustomFonts else { return .system(style, design: .default, weight: weight) }
        return .custom(name, size: size, relativeTo: style)
    }

    /// Display / heading face — Outfit 900, used for titles, labels, CTAs.
    static func display(_ size: CGFloat, weight: Font.Weight = .black, relativeTo style: Font.TextStyle = .headline) -> Font {
        named("Outfit-Black", size: size, weight: weight, relativeTo: style)
    }

    /// Body face — Inter, used for everything else.
    static func body(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        named("Inter-Regular", size: size, weight: weight, relativeTo: style)
    }

    // Preset styles mirroring the Design System board's type scale.
    static var largeTitle: Font { display(34, relativeTo: .largeTitle) }
    static var title1: Font { display(28, relativeTo: .title) }
    static var title3: Font { display(18, weight: .heavy, relativeTo: .title3) }
    static var headline: Font { body(17, weight: .bold, relativeTo: .headline) }
    static var bodyText: Font { body(17, relativeTo: .body) }
    static var subhead: Font { body(15, weight: .medium, relativeTo: .subheadline) }
    static var ctaLabel: Font { display(17, relativeTo: .body) }
    static var caption: Font { display(12, weight: .heavy, relativeTo: .caption) }
}

extension View {
    /// Uppercases + tracks a label the way `.manga-title` / `.lbl` do on web.
    func bkLabelStyle() -> some View {
        textCase(.uppercase).tracking(0.6)
    }
}
