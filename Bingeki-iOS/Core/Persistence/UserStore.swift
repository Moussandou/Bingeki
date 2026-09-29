import Foundation

@MainActor
protocol UserStoring: AnyObject {
    var profile: UserProfile { get }
    func addXP(_ amount: Int)
    func update(_ mutate: (inout UserProfile) -> Void)
}

/// Local placeholder until `Auth`/Firestore land (Phase 1). XP here is a
/// pure client-side optimistic display — see `GamificationCore`'s doc
/// comment on why the server stays authoritative.
@MainActor
@Observable
final class InMemoryUserStore: UserStoring {
    private(set) var profile: UserProfile

    init(profile: UserProfile) {
        self.profile = profile
    }

    func addXP(_ amount: Int) {
        profile.totalXp += amount
        let result = GamificationCore.level(fromTotalXP: profile.totalXp)
        profile.level = result.level
        profile.xp = result.xp
    }

    func update(_ mutate: (inout UserProfile) -> Void) {
        mutate(&profile)
    }
}

#if DEBUG
extension InMemoryUserStore {
    static var preview: InMemoryUserStore { InMemoryUserStore(profile: .sample) }
}
#endif
