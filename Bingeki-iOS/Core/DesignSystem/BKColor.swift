import SwiftUI

/// Design tokens — mirrors `src/styles/tokens.css` on the web.
/// Backed by Asset Catalog color sets so Light/Dark switch automatically
/// with the system, `.preferredColorScheme`, or the user's manual override
/// in Settings (§14 of the handoff doc).
enum BKColor {
    static let background = Color("BGColor")
    static let surface = Color("SurfaceColor")
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
}
