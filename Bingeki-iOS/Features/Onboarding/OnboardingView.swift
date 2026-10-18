import SwiftUI

/// États #1 — first launch: pick 3 loved titles to seed recommendations.
struct OnboardingView: View {
    let onFinish: ([Work]) -> Void
    let onSkip: () -> Void

    @Environment(\.userStore) private var userStore
    @State private var candidates: [Work] = []
    @State private var selected: [Work] = []
    @State private var failed = false

    private static let target = 3
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)

    var body: some View {
        VStack(alignment: .leading, spacing: BKSpace.lg) {
            HStack {
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(BKColor.surfaceTint)
                        Rectangle().fill(BKColor.brandPink)
                            .frame(width: proxy.size.width * Double(selected.count) / Double(Self.target))
                    }
                }
                .frame(width: 120, height: 6)
                .accessibilityLabel("\(selected.count) sur \(Self.target)")
                Spacer()
                Button("Passer", action: onSkip)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(BKColor.textSecondary)
                    .frame(minHeight: BKSize.minTapTarget)
            }

            Text("Tape 3 titres\nque tu as aimés")
                .font(BKFont.display(30))
                .textCase(.uppercase)
                .lineSpacing(-4)

            if failed {
                VStack(spacing: BKSpace.md) {
                    Text("Impossible de charger les titres.").foregroundStyle(BKColor.textSecondary)
                    BKOutlineButton(title: "Réessayer", systemImage: "arrow.clockwise") { Task { await load() } }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 10) {
                        if candidates.isEmpty {
                            ForEach(0..<9, id: \.self) { _ in
                                Rectangle().fill(BKColor.surfaceTint).frame(height: 150)
                            }
                        }
                        ForEach(candidates) { work in tile(work) }
                    }
                    .padding(4)
                }
                .scrollIndicators(.hidden)
            }

            Button {
                onFinish(selected)
            } label: {
                Text(ctaTitle)
                    .font(BKFont.ctaLabel)
                    .frame(maxWidth: .infinity)
                    .frame(height: BKSize.ctaHeight)
                    .foregroundStyle(isComplete ? .white : BKColor.textSecondary)
                    .background(isComplete ? BKColor.ctaFill : BKColor.surfaceTint)
                    .clipShape(BKChamferedShape(cut: 10))
            }
            .disabled(!isComplete)
        }
        .padding(.horizontal, BKSpace.screenMargin)
        .padding(.top, BKSpace.lg)
        .padding(.bottom, BKSpace.md)
        .background(BKColor.background.ignoresSafeArea())
        .task { await load() }
    }

    private var isComplete: Bool { selected.count >= Self.target }

    private var ctaTitle: String {
        let left = Self.target - selected.count
        return left > 0 ? "ENCORE \(left) TITRE\(left > 1 ? "S" : "")" : "C'EST PARTI"
    }

    private func tile(_ work: Work) -> some View {
        let isOn = selected.contains { $0.id == work.id }
        return Button {
            if isOn {
                selected.removeAll { $0.id == work.id }
            } else if selected.count < Self.target {
                selected.append(work)
                HapticEngine.added()
            }
        } label: {
            BKCover(url: work.imageSmall ?? work.image)
                .frame(height: 150)
                .overlay(alignment: .topTrailing) {
                    if isOn {
                        Image(systemName: "checkmark")
                            .font(.caption.weight(.black))
                            .foregroundStyle(.black)
                            .frame(width: 28, height: 28)
                            .background(BKColor.brandPink)
                            .bkInkBorder()
                            .padding(6)
                    }
                }
                .padding(2)
                .overlay(Rectangle().stroke(isOn ? BKColor.brandPink : .clear, lineWidth: 3))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(work.title)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func load() async {
        failed = false
        let sfw = !userStore.profile.nsfwMode
        async let anime = try? TenraiClient.shared.top(type: .anime, limit: 15, sfw: sfw)
        async let manga = try? TenraiClient.shared.top(type: .manga, limit: 15, sfw: sfw)
        let a = (await anime)?.data.map { $0.asWork(mediaType: .anime) } ?? []
        let m = (await manga)?.data.map { $0.asWork(mediaType: .manga) } ?? []
        var mixed: [Work] = []
        for i in 0..<max(a.count, m.count) {
            if i < a.count { mixed.append(a[i]) }
            if i < m.count { mixed.append(m[i]) }
        }
        candidates = mixed
        failed = mixed.isEmpty
    }
}

#Preview {
    OnboardingView(onFinish: { _ in }, onSkip: {})
        .environment(\.userStore, InMemoryUserStore.preview)
}
