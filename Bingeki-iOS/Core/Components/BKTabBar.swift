import SwiftUI

/// Bottom nav from the mockups: inked panel with 3 tabs + a square search button.
struct BKTabBar: View {
    @Binding var selection: RootTab
    let onSearch: () -> Void

    @Environment(\.dynamicTypeSize) private var typeSize

    private let items: [(tab: RootTab, label: String, icon: String)] = [
        (.home, "Accueil", "house"),
        (.discover, "Découvrir", "safari"),
        (.library, "Biblio", "books.vertical"),
    ]

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 0) {
                ForEach(items, id: \.tab) { item in
                    tabButton(item.tab, label: item.label, icon: item.icon)
                }
            }
            .frame(height: BKSize.tabBarHeight)
            .background(BKColor.surface)
            .bkInkBorder()
            .bkPanelShadow()

            Button(action: onSearch) {
                Image(systemName: "magnifyingglass")
                    .font(.title3.weight(.bold))
                    .frame(width: BKSize.tabBarHeight, height: BKSize.tabBarHeight)
                    .foregroundStyle(BKColor.textPrimary)
                    .background(BKColor.surface)
                    .bkInkBorder()
                    .bkPanelShadow()
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Rechercher")
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 4)
    }

    private func tabButton(_ tab: RootTab, label: String, icon: String) -> some View {
        let isOn = selection == tab
        return Button {
            if !isOn { HapticEngine.tabChanged() }
            selection = tab
        } label: {
            VStack(spacing: 3) {
                Image(systemName: isOn ? "\(icon).fill" : icon)
                    .font(.system(size: 20, weight: .bold))
                // Icons only at huge text sizes (§6.2); VoiceOver keeps the label.
                if typeSize < .accessibility3 {
                    Text(label)
                        .font(BKFont.display(11, weight: .heavy))
                        .textCase(.uppercase)
                        .tracking(0.4)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(isOn ? BKColor.accentText : BKColor.textSecondary)
            .overlay(alignment: .bottom) {
                if isOn { Rectangle().fill(BKColor.brandPink).frame(height: 3) }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isOn ? [.isSelected, .isButton] : .isButton)
    }
}

extension View {
    /// Per-tab setup: hides the system bar and reserves room for `BKTabBar`.
    func bkTabPage() -> some View {
        toolbar(.hidden, for: .tabBar)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: BKSize.tabBarHeight + 8)
            }
    }
}

#Preview {
    VStack {
        Spacer()
        BKTabBar(selection: .constant(.discover)) {}
    }
    .background(BKColor.background)
}
