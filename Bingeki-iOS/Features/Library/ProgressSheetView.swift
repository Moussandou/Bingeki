import SwiftUI

/// Progress sheet — big number, drag ruler for jumps, quick steps, status (board `S08-Progress`).
/// No "Save": every change applies and syncs immediately (§9).
struct ProgressSheetView: View {
    let work: Work
    var showsDetailLink = true

    @Environment(\.dismiss) private var dismiss
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @State private var showRatingSheet = false
    @State private var showDetail = false
    @State private var sessionStart: Int?
    @State private var sessionXP = 0

    private var current: Work { library.work(id: work.id) ?? work }
    private var unit: String { current.type == .anime ? "ép." : "ch." }

    var body: some View {
        NavigationStack {
            VStack(spacing: BKSpace.lg) {
                header
                bigNumber
                ProgressRuler(value: current.progress, maxValue: current.total) { set(to: $0) }
                    .padding(.horizontal, -BKSpace.lg)
                steps
                statusRow
                BKScorePicker(work: current)
                Spacer(minLength: 0)
                Button("Retirer de la bibliothèque") {
                    library.remove(id: work.id)
                    dismiss()
                }
                .font(.subheadline.weight(.semibold))
                .underline()
                .foregroundStyle(BKColor.textSecondary)
                .frame(minHeight: BKSize.minTapTarget)
            }
            .padding(.horizontal, BKSpace.lg)
            .padding(.top, BKSpace.lg)
            .background(BKColor.surface.ignoresSafeArea())
            .overlay(alignment: .top) { Rectangle().fill(BKColor.brandPink).frame(height: 3) }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $showDetail) { WorkDetailView(work: current) }
        }
        .onAppear { sessionStart = current.progress }
        .sheet(isPresented: $showRatingSheet) {
            RatingSheetView(work: current, xpGained: GamificationCore.XPReward.completeWork)
                .presentationDetents([.height(340)])
        }
    }

    private var header: some View {
        HStack(spacing: BKSpace.md) {
            BKCover(url: current.imageSmall ?? current.image).frame(width: 44, height: 62)
            VStack(alignment: .leading, spacing: 2) {
                Text(current.title).font(.headline).lineLimit(1)
                Text(subtitle).font(.caption).foregroundStyle(BKColor.textSecondary)
            }
            Spacer()
            if showsDetailLink {
                Button("Fiche ›") { showDetail = true }
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(BKColor.accentText)
                    .frame(minHeight: BKSize.minTapTarget)
            }
        }
    }

    private var subtitle: String {
        let type = current.type == .anime ? "Anime" : "Manga"
        return current.total.map { "\(type) · \($0) \(unit)" } ?? "\(type) · en cours de parution"
    }

    private var bigNumber: some View {
        VStack(spacing: 4) {
            HStack(alignment: .lastTextBaseline, spacing: 8) {
                Text("\(current.progress)")
                    .font(BKFont.display(84))
                    .contentTransition(.numericText())
                    .animation(.snappy, value: current.progress)
                Text(current.total.map { "/ \($0) \(unit)" } ?? unit)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(BKColor.textSecondary)
            }
            if let start = sessionStart, current.progress != start {
                let delta = current.progress - start
                Text("\(delta > 0 ? "+" : "")\(delta) cette session" + (sessionXP > 0 ? " · +\(sessionXP) XP" : ""))
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(BKColor.cyanText)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var steps: some View {
        HStack(spacing: 10) {
            stepButton("−1", delta: -1)
            stepButton("+5", delta: 5)
            stepButton("+10", delta: 10)
            Button { apply(delta: 1) } label: {
                Text("+1")
                    .font(BKFont.display(18))
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundStyle(.white)
                    .background(BKColor.ctaFill)
                    .clipShape(BKChamferedShape(cut: 10))
            }
            .layoutPriority(1.6)
        }
    }

    private func stepButton(_ label: String, delta: Int) -> some View {
        Button { apply(delta: delta) } label: {
            Text(label)
                .font(BKFont.display(16))
                .frame(maxWidth: .infinity, minHeight: 48)
                .foregroundStyle(BKColor.textPrimary)
                .background(BKColor.background)
                .bkInkBorder(BKColor.border)
        }
        .accessibilityLabel(delta < 0 ? "Moins un" : "Plus \(delta)")
    }

    private var statusRow: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            Text("STATUT").font(BKFont.caption).tracking(1).foregroundStyle(BKColor.textSecondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: BKSpace.sm) {
                    ForEach(WorkStatus.allCases, id: \.self) { status in
                        Button { setStatus(status) } label: {
                            BKStatusChip(status: status, isSelected: current.status == status)
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(current.status == status ? .isSelected : [])
                    }
                }
            }
            .padding(.trailing, -BKSpace.lg)
        }
    }

    // MARK: - Actions

    private func apply(delta: Int) {
        set(to: current.progress + delta)
    }

    private func set(to value: Int) {
        let before = current.progress
        guard value != before else { return }
        var updated = current
        let wasIncomplete = updated.status != .completed
        updated.incrementProgress(by: value - before)
        let gained = updated.progress - before
        guard gained != 0 else { return }
        library.upsert(updated)
        if gained > 0 {
            let xp = GamificationCore.XPReward.updateProgress * gained
            userStore.addXP(xp)
            sessionXP += xp
        }
        HapticEngine.progressTick()
        if wasIncomplete, updated.status == .completed {
            userStore.addXP(GamificationCore.XPReward.completeWork)
            sessionXP += GamificationCore.XPReward.completeWork
            HapticEngine.success()
            showRatingSheet = true
        }
    }

    private func setStatus(_ status: WorkStatus) {
        guard status != current.status else { return }
        var updated = current
        updated.status = status
        updated.lastUpdated = .now
        if status == .completed, let total = updated.total {
            updated.currentEpisode = updated.type == .anime ? total : updated.currentEpisode
            updated.currentChapter = updated.type == .manga ? total : updated.currentChapter
        }
        library.upsert(updated)
        HapticEngine.added()
        if status == .completed { showRatingSheet = true }
    }
}

/// Horizontal ruler: drag to scrub, one notch per unit, a tick every 5.
private struct ProgressRuler: View {
    let value: Int
    let maxValue: Int?
    let onChange: (Int) -> Void

    @State private var dragStart: Int?
    private let spacing: CGFloat = 15

    var body: some View {
        GeometryReader { proxy in
            let mid = proxy.size.width / 2
            Canvas { context, size in
                let visible = Int(size.width / spacing) / 2 + 2
                for offset in -visible...visible {
                    let n = value + offset
                    guard n >= 0, maxValue.map({ n <= $0 }) ?? true else { continue }
                    let x = mid + CGFloat(offset) * spacing
                    let major = n % 5 == 0
                    let rect = CGRect(x: x - (major ? 1.5 : 1), y: major ? 8 : 14, width: major ? 3 : 2, height: major ? 48 : 36)
                    context.fill(Path(rect), with: .color(major ? BKColor.textPrimary : BKColor.border))
                }
            }
            .mask(LinearGradient(stops: [
                .init(color: .clear, location: 0), .init(color: .black, location: 0.2),
                .init(color: .black, location: 0.8), .init(color: .clear, location: 1),
            ], startPoint: .leading, endPoint: .trailing))
            .overlay {
                Rectangle().fill(BKColor.brandPink).frame(width: 4)
                    .shadow(color: BKColor.brandPink.opacity(0.8), radius: 6)
            }
        }
        .frame(height: 64)
        .background(BKColor.background)
        .overlay(alignment: .top) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(BKColor.surfaceTint).frame(height: 1) }
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 4)
                .onChanged { drag in
                    let start = dragStart ?? value
                    dragStart = start
                    var target = start - Int((drag.translation.width / spacing).rounded())
                    target = max(0, maxValue.map { min(target, $0) } ?? target)
                    if target != value {
                        HapticEngine.sliderNotch()
                        onChange(target)
                    }
                }
                .onEnded { _ in dragStart = nil }
        )
        .accessibilityElement()
        .accessibilityLabel("Progression")
        .accessibilityValue("\(value)")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: onChange(value + 1)
            case .decrement: onChange(max(0, value - 1))
            @unknown default: break
            }
        }
    }
}

/// Personal score /10, editable at any status — same 1–10 buttons as the
/// end-of-series sheet. Tapping the current score again clears it.
struct BKScorePicker: View {
    let work: Work
    @Environment(\.libraryStore) private var library

    private var score: Int? { library.work(id: work.id)?.rating ?? work.rating }

    var body: some View {
        VStack(alignment: .leading, spacing: BKSpace.sm) {
            HStack {
                Text("MA NOTE").font(BKFont.caption).tracking(1).foregroundStyle(BKColor.textSecondary)
                Spacer()
                Text(score.map { "\($0)/10 · \(RatingSheetView.label(for: $0))" } ?? "Pas encore notée")
                    .font(BKFont.display(12, weight: .heavy))
                    .foregroundStyle(score == nil ? BKColor.textSecondary : BKColor.accentText)
            }
            HStack(spacing: 4) {
                ForEach(1...10, id: \.self) { n in
                    let isOn = score == n
                    Button { set(isOn ? nil : n) } label: {
                        Text("\(n)")
                            .font(BKFont.display(14))
                            .frame(maxWidth: .infinity, minHeight: 40)
                            .foregroundStyle(isOn ? .black : BKColor.textPrimary)
                            .background(isOn ? BKColor.brandPink : .clear)
                            .bkInkBorder(isOn ? BKColor.ink : BKColor.border)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(n) sur 10, \(RatingSheetView.label(for: n))")
                    .accessibilityAddTraits(isOn ? .isSelected : [])
                }
            }
        }
    }

    private func set(_ value: Int?) {
        var updated = library.work(id: work.id) ?? work
        updated.rating = value
        updated.lastUpdated = .now
        library.upsert(updated)
        HapticEngine.progressTick()
    }
}

/// États #11 — series finished: rate in one tap, "Plus tard" never penalizes.
struct RatingSheetView: View {
    let work: Work
    var xpGained: Int = 0
    @Environment(\.dismiss) private var dismiss
    @Environment(\.libraryStore) private var library
    @State private var picked: Int?

    var body: some View {
        VStack(spacing: BKSpace.md) {
            Text("Terminé !")
                .font(BKFont.display(36))
                .textCase(.uppercase)
                .foregroundStyle(BKColor.greenText)
                .rotationEffect(.degrees(-2))
            Text(summary).font(.subheadline.weight(.semibold))
            Text("Ta note ?").font(.subheadline).foregroundStyle(BKColor.textSecondary)
            HStack(spacing: 4) {
                ForEach(1...10, id: \.self) { n in
                    Button { rate(n) } label: {
                        Text("\(n)")
                            .font(BKFont.display(15))
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .foregroundStyle(picked == n ? .black : BKColor.textPrimary)
                            .background(picked == n ? BKColor.brandPink : .clear)
                            .bkInkBorder(picked == n ? BKColor.ink : BKColor.border)
                    }
                    .accessibilityLabel("\(n) sur 10, \(Self.label(for: n))")
                }
            }
            Text(picked.map { "\($0) · \(Self.label(for: $0))" } ?? " ")
                .font(BKFont.display(14, weight: .heavy))
                .foregroundStyle(BKColor.accentText)
            Button("Plus tard") { dismiss() }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(BKColor.textSecondary)
                .frame(minHeight: BKSize.minTapTarget)
        }
        .padding(BKSpace.lg)
        .onAppear { picked = work.rating }
    }

    private var summary: String {
        let unit = work.type == .anime ? "ép." : "ch."
        let count = work.total.map { "\($0) / \($0) \(unit)" } ?? "\(work.progress) \(unit)"
        return [work.title, count, xpGained > 0 ? "+\(xpGained) XP" : nil].compactMap { $0 }.joined(separator: " · ")
    }

    private func rate(_ n: Int) {
        picked = n
        var updated = library.work(id: work.id) ?? work
        updated.rating = n
        updated.lastUpdated = .now
        library.upsert(updated)
        HapticEngine.success()
        Task {
            try? await Task.sleep(for: .milliseconds(700))
            dismiss()
        }
    }

    static func label(for score: Int) -> String {
        switch score {
        case 10: return "LÉGENDAIRE"
        case 9: return "CHEF-D'ŒUVRE"
        case 8: return "EXCELLENT"
        case 7: return "TRÈS BON"
        case 6: return "BON"
        case 5: return "CORRECT"
        case 4: return "BOF"
        case 3: return "MAUVAIS"
        case 2: return "TRÈS MAUVAIS"
        default: return "À FUIR"
        }
    }
}

#Preview {
    ProgressSheetView(work: .sampleOnePiece)
        .environment(\.libraryStore, InMemoryLibraryStore.preview)
        .environment(\.userStore, InMemoryUserStore.preview)
        .environment(ToastCenter())
}
