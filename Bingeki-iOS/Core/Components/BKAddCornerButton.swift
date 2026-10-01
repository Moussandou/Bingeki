import SwiftUI

/// Black "+" square pinned on a cover: adds to "À voir" with an undo toast.
/// Hidden once the title is in the library.
struct BKAddCornerButton: View {
    let work: Work
    var size: CGFloat = 32

    @Environment(\.libraryStore) private var library
    @Environment(\.userStore) private var userStore
    @Environment(ToastCenter.self) private var toasts

    var body: some View {
        if library.work(id: work.id) == nil {
            Button {
                var added = work
                added.status = .planToRead
                added.dateAdded = .now
                added.lastUpdated = .now
                library.upsert(added)
                userStore.addXP(GamificationCore.XPReward.addWork)
                HapticEngine.added()
                toasts.show("\(work.title) → À voir") { [weak library] in library?.remove(id: work.id) }
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: size * 0.5, weight: .black))
                    .frame(width: size, height: size)
                    .foregroundStyle(BKColor.brandPink)
                    .background(.black)
                    .overlay(Rectangle().stroke(BKColor.brandPink, lineWidth: 2))
                    .frame(minWidth: BKSize.minTapTarget, minHeight: BKSize.minTapTarget, alignment: .topTrailing)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(4)
            .accessibilityLabel("Ajouter \(work.title)")
        }
    }
}
