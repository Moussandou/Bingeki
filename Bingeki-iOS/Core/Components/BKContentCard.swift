import SwiftUI

/// A work cover with the halftone-dot texture used across the mockups.
/// Loads real covers over the network (Tenrai/AniList URLs); shows a
/// gradient placeholder while loading or on failure — never a blank box.
struct BKCover: View {
    let url: URL?
    var cornerAccent: Color = BKColor.brandPink

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        LinearGradient(
                            colors: [cornerAccent.opacity(0.55), BKColor.ink.opacity(0.85)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    }
                }
                .frame(width: proxy.size.width, height: proxy.size.height)
                .clipped()

                // Halftone dot overlay — matches `.cv::after` on web.
                Canvas { context, size in
                    let spacing: CGFloat = 7
                    var x: CGFloat = 0
                    while x < size.width {
                        var y: CGFloat = 0
                        while y < size.height {
                            let dot = Path(ellipseIn: CGRect(x: x, y: y, width: 1.4, height: 1.4))
                            context.fill(dot, with: .color(.black.opacity(0.22)))
                            y += spacing
                        }
                        x += spacing
                    }
                }
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.ink, lineWidth: 2))
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}

/// A status pill — always color + icon + label, never color alone (§10).
struct BKStatusChip: View {
    let status: WorkStatus
    var isSelected: Bool = false

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: status.iconName)
            Text(status.label)
        }
        .font(BKFont.display(13, weight: .heavy))
        .padding(.horizontal, 10)
        .frame(height: 36)
        .foregroundStyle(isSelected ? .black : BKColor.textPrimary)
        .background(isSelected ? status.color : .clear)
        .overlay(RoundedRectangle(cornerRadius: 0).stroke(isSelected ? BKColor.ink : BKColor.border, lineWidth: 2))
    }
}

extension WorkStatus {
    var label: String {
        switch self {
        case .reading: return "En cours"
        case .planToRead: return "À voir"
        case .completed: return "Terminé"
        case .onHold: return "En pause"
        case .dropped: return "Abandonné"
        }
    }

    var iconName: String {
        switch self {
        case .reading: return "play.fill"
        case .planToRead: return "plus"
        case .completed: return "checkmark"
        case .onHold: return "pause.fill"
        case .dropped: return "xmark"
        }
    }

    var color: Color {
        switch self {
        case .reading: return BKColor.brandPink
        case .planToRead: return BKColor.brandCyan
        case .completed: return BKColor.greenText
        case .onHold: return BKColor.orangeText
        case .dropped: return .gray
        }
    }
}

#Preview {
    HStack {
        BKCover(url: Work.sampleFrieren.image).frame(width: 100, height: 146)
        VStack(alignment: .leading) {
            BKStatusChip(status: .reading, isSelected: true)
            BKStatusChip(status: .completed)
        }
    }
    .padding()
}
