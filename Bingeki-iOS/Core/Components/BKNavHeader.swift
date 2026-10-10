import SwiftUI
import UIKit

/// Inked square icon used for every header action (back, share, settings…),
/// instead of the system navigation bar's round glass buttons.
struct BKHeaderIcon: View {
    let systemName: String

    var body: some View {
        Image(systemName: systemName)
            .font(.body.weight(.bold))
            .frame(width: 44, height: 44)
            .foregroundStyle(BKColor.textPrimary)
            .background(BKColor.surface)
            .bkInkBorder(BKColor.border)
    }
}

/// Header that replaces the system navigation bar: back square on the left,
/// optional uppercase title centred, trailing actions on the right.
struct BKNavHeader<Trailing: View>: View {
    var title: String?
    var showsBack = true
    var onBack: (() -> Void)?
    @ViewBuilder var trailing: () -> Trailing

    @Environment(\.dismiss) private var dismiss
    /// In a sheet there is no status-bar inset, so the buttons would sit on
    /// the grabber and the rounded corners; give them room in that case.
    @State private var inSheet = false

    var body: some View {
        ZStack {
            if let title {
                Text(title)
                    .font(BKFont.display(16))
                    .textCase(.uppercase)
                    .tracking(1)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .padding(.horizontal, 110)
                    .accessibilityAddTraits(.isHeader)
            }
            HStack(spacing: BKSpace.sm) {
                if showsBack {
                    Button { if let onBack { onBack() } else { dismiss() } } label: { BKHeaderIcon(systemName: "chevron.left") }
                        .accessibilityLabel("Retour")
                }
                Spacer(minLength: 0)
                trailing()
            }
        }
        .buttonStyle(.plain)
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, inSheet ? BKSpace.xl : BKSpace.sm)
        .padding(.bottom, BKSpace.sm)
        .onGeometryChange(for: Bool.self) { $0.safeAreaInsets.top < 1 } action: { inSheet = $0 }
    }
}

extension BKNavHeader where Trailing == EmptyView {
    init(title: String? = nil, showsBack: Bool = true, onBack: (() -> Void)? = nil) {
        self.init(title: title, showsBack: showsBack, onBack: onBack) { EmptyView() }
    }
}

extension View {
    /// Hides the system bar and pins a `BKNavHeader` at the top; content
    /// scrolls under it.
    /// `opaque: false` lets the content behind show through (e.g. the work
    /// page's blurred cover); otherwise scrolled content passes under a solid bar.
    func bkNavigationHeader<Trailing: View>(
        _ title: String? = nil,
        showsBack: Bool = true,
        opaque: Bool = true,
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }
    ) -> some View {
        toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top, spacing: 0) {
                if opaque {
                    BKNavHeader(title: title, showsBack: showsBack, trailing: trailing).bkPinnedHeaderBackground()
                } else {
                    BKNavHeader(title: title, showsBack: showsBack, trailing: trailing)
                }
            }
    }

    /// Solid page-coloured backing (up under the status bar) plus a hairline,
    /// so content scrolling beneath a pinned header doesn't show through it.
    func bkPinnedHeaderBackground() -> some View {
        background {
            BKColor.background
                .ignoresSafeArea(edges: .top)
                .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
        }
    }
}

/// Hiding the system bar also disables the edge swipe to go back; keep it.
extension UINavigationController: @retroactive UIGestureRecognizerDelegate {
    override open func viewDidLoad() {
        super.viewDidLoad()
        interactivePopGestureRecognizer?.delegate = self
    }

    public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        viewControllers.count > 1
    }
}
