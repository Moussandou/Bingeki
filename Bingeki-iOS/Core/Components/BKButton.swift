import SwiftUI

/// Primary CTA — 56pt, filled `#E0104A`, chamfered corners, matching the
/// mockups' `.cham` button. One per screen (rule #1 of the design principles).
struct BKPrimaryButton: View {
    let title: String
    var systemImage: String?
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: BKSpace.sm) {
                if isLoading {
                    ProgressView().tint(.white)
                } else if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
                    .font(BKFont.ctaLabel)
                    .bkLabelStyle()
            }
            .frame(maxWidth: .infinity)
            .frame(height: BKSize.ctaHeight)
            .foregroundStyle(.white)
            .background(BKColor.ctaFill)
            .clipShape(BKChamferedShape(cut: 10))
        }
        .disabled(isLoading)
        .accessibilityAddTraits(.isButton)
    }
}

/// Secondary action — outlined, ink border.
struct BKOutlineButton: View {
    let title: String
    var systemImage: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: BKSpace.sm) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title).font(BKFont.display(15, weight: .heavy))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(BKColor.textPrimary)
            .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.border, lineWidth: 2))
        }
    }
}

/// The chamfered (cut-corner) shape used on every primary CTA, matching the
/// web's `clip-path: polygon(...)` treatment.
struct BKChamferedShape: Shape {
    var cut: CGFloat = 10

    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX + cut, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - cut))
        p.addLine(to: CGPoint(x: rect.maxX - cut, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + cut))
        p.closeSubpath()
        return p
    }
}

#Preview {
    VStack(spacing: 16) {
        BKPrimaryButton(title: "Ajouter à ma liste", systemImage: "plus") {}
        BKOutlineButton(title: "Passer") {}
    }
    .padding()
}
