import SwiftUI

/// A single non-blocking confirmation, e.g. "Frieren → À voir · Annuler",
/// as seen throughout the Discover/Search/Add flows. One toast at a time;
/// posting a new one replaces the current one.
@MainActor
@Observable
final class ToastCenter {
    struct Toast: Identifiable, Equatable {
        let id = UUID()
        var text: String
        var undoAction: (() -> Void)?

        static func == (lhs: Toast, rhs: Toast) -> Bool { lhs.id == rhs.id }
    }

    private(set) var current: Toast?
    private var dismissTask: Task<Void, Never>?

    func show(_ text: String, undo: (() -> Void)? = nil) {
        dismissTask?.cancel()
        current = Toast(text: text, undoAction: undo)
        dismissTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            self?.current = nil
        }
    }

    func undo() {
        current?.undoAction?()
        dismissTask?.cancel()
        current = nil
    }
}

struct BKToastOverlay: View {
    @Environment(ToastCenter.self) private var center

    var body: some View {
        VStack {
            Spacer()
            if let toast = center.current {
                HStack {
                    Text(toast.text)
                        .font(.subheadline.weight(.bold))
                        .lineLimit(2)
                    if toast.undoAction != nil {
                        Spacer()
                        Button("ANNULER") { center.undo() }
                            .font(BKFont.display(13))
                            .foregroundStyle(BKColor.accentText)
                    }
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 52)
                .foregroundStyle(BKColor.textPrimary)
                .background(BKColor.background)
                .bkInkBorder()
                .bkPanelShadow(BKColor.brandPink)
                .padding(.horizontal, BKSpace.screenMargin)
                .padding(.bottom, BKSize.tabBarHeight + BKSpace.xl)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .accessibilityElement(children: .combine)
            }
        }
        .animation(.easeOut(duration: 0.25), value: center.current)
        .allowsHitTesting(center.current != nil)
    }
}
