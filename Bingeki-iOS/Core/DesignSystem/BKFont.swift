import SwiftUI

/// Typography — Outfit for display/CTA, Inter for body, mapped onto Dynamic
/// Type styles so the system text-size setting works (§6.2 of the handoff
/// doc). Both are OFL-licensed Google Fonts, embedded as static weights in
/// `Resources/Fonts` (instantiated from the variable sources — see that
/// folder's files) and registered via `UIAppFonts` in project.yml.
enum BKFont {
    static let useCustomFonts = true

    /// Nearest embedded Outfit weight for a requested `Font.Weight`
    /// (only SemiBold/Bold/ExtraBold/Black are bundled — Outfit is used for
    /// display text only, which never needs lighter weights).
    private static func outfitName(for weight: Font.Weight) -> String {
        switch weight {
        case .black, .heavy: return "Outfit-Black"
        case .bold: return "Outfit-Bold"
        case .semibold, .medium, .regular: return "Outfit-SemiBold"
        default: return "Outfit-ExtraBold"
        }
    }

    private static func interName(for weight: Font.Weight) -> String {
        switch weight {
        case .bold, .heavy, .black: return "Inter-Bold"
        case .semibold: return "Inter-SemiBold"
        case .medium: return "Inter-Medium"
        default: return "Inter-Regular"
        }
    }

    /// Display / heading face — Outfit, used for titles, labels, CTAs.
    static func display(_ size: CGFloat, weight: Font.Weight = .black, relativeTo style: Font.TextStyle = .headline) -> Font {
        guard useCustomFonts else { return .system(style, design: .default, weight: weight) }
        return .custom(outfitName(for: weight), size: size, relativeTo: style)
    }

    /// Body face — Inter, used for everything else.
    static func body(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        guard useCustomFonts else { return .system(style, design: .default, weight: weight) }
        return .custom(interName(for: weight), size: size, relativeTo: style)
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
