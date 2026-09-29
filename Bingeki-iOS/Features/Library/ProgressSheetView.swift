import SwiftUI

/// Progress sheet — big number + a horizontal ruler for jumps, `+1` for the
/// everyday case, status picker at the bottom (board `S08-Progress`).
/// No "Save" button: every change applies and syncs immediately (§9).
struct ProgressSheetView: View {
    let work: Work
    @Environment(\.dismiss) private var dismiss
    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @State private var showRatingSheet = false

    private var current: Work { library.work(id: work.id) ?? work }

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Capsule().fill(BKColor.border).frame(width: 40, height: 5).padding(.top, BKSpace.sm)

            HStack(spacing: BKSpace.md) {
                BKCover(url: work.image).frame(width: 44, height: 62)
                VStack(alignment: .leading) {
                    Text(work.title).font(.subheadline.weight(.bold))
                    Text(current.status.label).font(.caption).foregroundStyle(BKColor.textSecondary)
                }
                Spacer()
                Button("OK") { dismiss() }.font(BKFont.display(15)).foregroundStyle(BKColor.accentText)
            }

            VStack(spacing: 4) {
                HStack(alignment: .lastTextBaseline, spacing: 8) {
                    Text("\(current.progress)").font(BKFont.display(80))
                    if let total = current.total { Text("/ \(total)").font(.subheadline.weight(.semibold)).foregroundStyle(BKColor.textSecondary) }
                }
            }

            HStack(spacing: BKSpace.sm) {
                stepButton("−1", delta: -1)
                stepButton("+5", delta: 5)
                Button {
                    apply(delta: 1)
                } label: {
                    Text("+1")
                        .font(BKFont.display(18))
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .foregroundStyle(.white)
                        .background(BKColor.ctaFill)
                }
                .frame(width: 120)
            }

            VStack(alignment: .leading, spacing: BKSpace.sm) {
                Text("STATUT").font(BKFont.caption).foregroundStyle(BKColor.textSecondary)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: BKSpace.sm) {
                        ForEach(WorkStatus.allCases, id: \.self) { status in
                            Button {
                                setStatus(status)
                            } label: {
                                BKStatusChip(status: status, isSelected: current.status == status)
                            }
                        }
                    }
                }
            }

            Button("Retirer de la bibliothèque", role: .destructive) {
                library.remove(id: work.id)
                dismiss()
            }
            .font(.subheadline)
            .padding(.top, BKSpace.sm)

            Spacer()
        }
        .padding(.horizontal, BKSpace.lg)
        .background(BKColor.surface)
        .sheet(isPresented: $showRatingSheet) {
            RatingSheetView(work: current).presentationDetents([.medium])
        }
    }

    private func stepButton(_ label: String, delta: Int) -> some View {
        Button(label) { apply(delta: delta) }
            .font(BKFont.display(16))
            .frame(maxWidth: .infinity, minHeight: 48)
            .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.border, lineWidth: 2))
    }

    private func apply(delta: Int) {
        var updated = current
        let wasIncomplete = updated.status != .completed
        updated.incrementProgress(by: delta)
        library.upsert(updated)
        if delta > 0 { userStore.addXP(GamificationCore.XPReward.updateProgress * delta) }
        HapticEngine.progressTick()
        if wasIncomplete, updated.status == .completed {
            userStore.addXP(GamificationCore.XPReward.completeWork)
            HapticEngine.success()
            showRatingSheet = true
        }
    }

    private func setStatus(_ status: WorkStatus) {
        var updated = current
        updated.status = status
        if status == .completed, let total = updated.total { updated.currentEpisode = total; updated.currentChapter = total }
        library.upsert(updated)
        if status == .completed { showRatingSheet = true }
    }
}

/// Terminated-series moment: rate in one tap, "Plus tard" never penalizes.
private struct RatingSheetView: View {
    let work: Work
    @Environment(\.dismiss) private var dismiss
    @Environment(\.libraryStore) private var library

    var body: some View {
        VStack(spacing: BKSpace.lg) {
            Text("Terminé !").font(BKFont.title1).foregroundStyle(BKColor.greenText)
            Text(work.title).font(.subheadline.weight(.bold))
            Text("Ta note ?").font(.subheadline).foregroundStyle(BKColor.textSecondary)
            HStack(spacing: 4) {
                ForEach(1...10, id: \.self) { n in
                    Button("\(n)") {
                        var updated = work
                        updated.score = n
                        library.upsert(updated)
                        dismiss()
                    }
                    .font(BKFont.display(14))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .overlay(RoundedRectangle(cornerRadius: 0).stroke(BKColor.border, lineWidth: 2))
                }
            }
            Button("Plus tard") { dismiss() }.font(.subheadline).foregroundStyle(BKColor.textSecondary)
        }
        .padding(BKSpace.lg)
    }
}

#Preview {
    ProgressSheetView(work: .sampleOnePiece)
        .environment(\.libraryStore, InMemoryLibraryStore.preview)
        .environment(\.userStore, InMemoryUserStore.preview)
}
