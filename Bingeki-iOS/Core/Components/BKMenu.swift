import SwiftUI

/// One row of a `BKMenu`.
struct BKMenuItem: Identifiable {
    let id: String
    let title: String
    var icon: String?
    var isSelected = false
    let action: () -> Void
}

/// Dropdown in the app's manga-panel style (ink border, offset shadow,
/// square corners) instead of the system's frosted `Menu`. The panel opens
/// under the label (or above it with `opensUpward`) and closes on a choice
/// or a tap anywhere else. Give the menu's container a `zIndex` above the
/// content it should float over.
struct BKMenu<Label: View>: View {
    let items: [BKMenuItem]
    var alignment: HorizontalAlignment = .trailing
    var opensUpward = false
    var width: CGFloat = 230
    @ViewBuilder var label: () -> Label

    @State private var open = false
    @State private var labelHeight: CGFloat = 44

    var body: some View {
        Button {
            withAnimation(.snappy(duration: 0.18)) { open.toggle() }
            HapticEngine.tabChanged()
        } label: {
            label()
        }
        .buttonStyle(.plain)
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { labelHeight = $0 }
        .overlay(alignment: overlayAlignment) {
            if open {
                ZStack(alignment: overlayAlignment) {
                    // Tap-outside catcher, much larger than the screen.
                    Color.black.opacity(0.001)
                        .frame(width: 4000, height: 4000)
                        .onTapGesture { close() }
                        .accessibilityHidden(true)
                    panel
                        .offset(y: opensUpward ? -(labelHeight + 8) : labelHeight + 8)
                        .transition(.asymmetric(insertion: .scale(scale: 0.9, anchor: anchor).combined(with: .opacity),
                                                removal: .opacity))
                }
                .frame(width: 0, height: 0, alignment: overlayAlignment)
            }
        }
        .zIndex(open ? 100 : 0)
    }

    private var overlayAlignment: Alignment {
        switch (alignment, opensUpward) {
        case (.leading, false): .topLeading
        case (.leading, true): .bottomLeading
        case (_, false): .topTrailing
        case (_, true): .bottomTrailing
        }
    }

    private var anchor: UnitPoint {
        switch (alignment, opensUpward) {
        case (.leading, false): .topLeading
        case (.leading, true): .bottomLeading
        case (_, false): .topTrailing
        case (_, true): .bottomTrailing
        }
    }

    private var panel: some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                Button {
                    close()
                    item.action()
                } label: {
                    HStack(spacing: 12) {
                        if let icon = item.icon {
                            Image(systemName: icon).font(.system(size: 15, weight: .bold)).frame(width: 22)
                        }
                        Text(item.title).font(BKFont.display(15, weight: .heavy))
                        Spacer(minLength: 8)
                        if item.isSelected {
                            Image(systemName: "checkmark").font(.system(size: 13, weight: .black))
                        }
                    }
                    .padding(.horizontal, 14).frame(height: 48)
                    .foregroundStyle(item.isSelected ? .white : BKColor.textPrimary)
                    .background(item.isSelected ? BKColor.brandPink : BKColor.surface)
                    .contentShape(Rectangle())
                    .overlay(alignment: .top) {
                        if index > 0 { Rectangle().fill(BKColor.border).frame(height: 1.5) }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(item.isSelected ? [.isSelected, .isButton] : .isButton)
            }
        }
        .frame(width: width)
        .background(BKColor.surface)
        .bkInkBorder(BKColor.border, width: 2.5)
        .bkPanelShadow(BKColor.ink, offset: 5)
    }

    private func close() {
        withAnimation(.easeOut(duration: 0.15)) { open = false }
    }
}
