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
    /// Per-tab setup on the NavigationStack: hides the system bar, reserves room for `BKTabBar`.
    func bkTabPage() -> some View {
        toolbar(.hidden, for: .tabBar)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: BKSize.tabBarHeight + 8)
            }
    }

    /// On a tab's root view (NavigationStack doesn't forward top insets).
    func bkOfflineBanner() -> some View {
        modifier(BKOfflineInset())
    }
}

private struct BKOfflineInset: ViewModifier {
    @Environment(NetworkMonitor.self) private var network
    @Environment(\.libraryStore) private var library

    func body(content: Content) -> some View {
        content
            .safeAreaInset(edge: .top, spacing: 0) {
                if !network.isOnline { BKOfflineBanner(pendingChanges: library.pendingChanges) }
            }
            .animation(.easeOut(duration: 0.2), value: network.isOnline)
    }
}

/// États #6 — everything keeps working, sync resumes when back online.
struct BKOfflineBanner: View {
    let pendingChanges: Int

    var body: some View {
        HStack(spacing: BKSpace.sm) {
            Image(systemName: "wifi.slash").font(.caption.weight(.bold))
            Text(pendingChanges > 0
                 ? "Hors ligne · \(pendingChanges) modif\(pendingChanges > 1 ? "s" : "") en attente"
                 : "Hors ligne · synchro au retour")
                .font(BKFont.display(13, weight: .heavy))
            Spacer()
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .frame(height: 36)
        .foregroundStyle(.black)
        .background(BKColor.warningFill)
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.ink).frame(height: 2) }
        .transition(.move(edge: .top).combined(with: .opacity))
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    VStack {
        Spacer()
        BKTabBar(selection: .constant(.discover)) {}
    }
    .background(BKColor.background)
}
