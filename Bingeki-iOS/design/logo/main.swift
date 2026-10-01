// Renders SplashLogo.imageset from BKLogoShapes so the system launch screen
// is pixel-identical to BKSplashView's first frame. Run via render-launch.sh.
import SwiftUI
import AppKit

@MainActor func render(ink: Color, bolt: Color, scale: CGFloat, to path: String) {
    let height: CGFloat = 132
    let view = ZStack {
        BKLogoInk().fill(ink, style: FillStyle(eoFill: true))
        BKLogoBolt().fill(bolt, style: FillStyle(eoFill: true))
    }
    .frame(width: height * BKLogo.aspectRatio, height: height)
    let renderer = ImageRenderer(content: view)
    renderer.scale = scale
    guard let cg = renderer.cgImage else { fatalError("render failed") }
    let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!
    try! data.write(to: URL(fileURLWithPath: path))
}

let dir = CommandLine.arguments[1]
let red = Color(red: 0.898, green: 0.118, blue: 0.165)
MainActor.assumeIsolated {
    for s in [1, 2, 3] {
        render(ink: Color(red: 0.067, green: 0.067, blue: 0.067), bolt: red, scale: CGFloat(s), to: "\(dir)/mark-light@\(s)x.png")
        render(ink: Color(red: 0.94, green: 0.94, blue: 0.94), bolt: red, scale: CGFloat(s), to: "\(dir)/mark-dark@\(s)x.png")
    }
}
