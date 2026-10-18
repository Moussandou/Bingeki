import SwiftUI

/// Design tokens — mirrors `src/styles/tokens.css` on the web.
/// Backed by Asset Catalog color sets so Light/Dark switch automatically
/// with the system, `.preferredColorScheme`, or the user's manual override
/// in Settings (§14 of the handoff doc).
enum BKColor {
    /// In dark mode with the AMOLED theme selected, the two large surfaces
    /// go true black instead of the `#121212`/`#1E1E1E` dark palette.
    static let background = amoledAware("BGColor", amoled: .black)
    static let surface = amoledAware("SurfaceColor", amoled: UIColor(white: 0.06, alpha: 1))
    static let surfaceTint = Color("SurfaceTint")
    static let textPrimary = Color("TextPrimary")
    static let textSecondary = Color("TextSecondary")
    static let border = Color("BorderColor")

    /// Text-safe accent — AA contrast in both themes (web token `--acc`).
    static let accentText = Color("AccentText")
    static let cyanText = Color("CyanText")
    static let greenText = Color("GreenText")
    static let orangeText = Color("OrangeText")

    /// Fixed across themes — never read from the palette, always literal.
    static let ctaFill = Color("CTAFill")
    static let brandPink = Color("BrandPink")
    static let brandCyan = Color("BrandCyan")
    static let ink = Color("InkFixed")
    /// Amber `#F59E0B` behind black text (offline banner), same in both themes.
    static let warningFill = Color(red: 0.961, green: 0.620, blue: 0.043)

    private static func amoledAware(_ assetName: String, amoled: UIColor) -> Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark, traits[BKAmoledTrait.self] {
                return amoled
            }
            return UIColor(named: assetName) ?? .systemBackground
        })
    }
}

/// AMOLED is still `.dark` as far as the color scheme goes, so switching
/// Sombre ↔ AMOLED wouldn't re-resolve any color on its own. A custom trait,
/// bridged to `\.bkAmoled` and set once on the root, makes every dynamic
/// color above re-resolve the moment the setting changes.
struct BKAmoledTrait: UITraitDefinition {
    static let defaultValue = false
}

private struct BKAmoledKey: UITraitBridgedEnvironmentKey {
    static let defaultValue = false
    static func read(from traitCollection: UITraitCollection) -> Bool {
        traitCollection[BKAmoledTrait.self]
    }
    static func write(to mutableTraits: inout UIMutableTraits, value: Bool) {
        mutableTraits[BKAmoledTrait.self] = value
    }
}

extension EnvironmentValues {
    var bkAmoled: Bool {
        get { self[BKAmoledKey.self] }
        set { self[BKAmoledKey.self] = newValue }
    }
}
