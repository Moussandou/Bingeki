import Foundation

@MainActor
protocol UserStoring: AnyObject {
    var profile: UserProfile { get }
    var recentLevelUp: Int? { get }
    func addXP(_ amount: Int)
    func update(_ mutate: (inout UserProfile) -> Void)
    func clearLevelUp()
}

/// Local placeholder until `Auth`/Firestore land (Phase 1). XP here is a
/// pure client-side optimistic display — see `GamificationCore`'s doc
/// comment on why the server stays authoritative.
@MainActor
@Observable
final class InMemoryUserStore: UserStoring {
    private(set) var profile: UserProfile
    /// Non-nil for ~1.6s after a level-up — states board #12 ("moment de
    /// marque … se ferme seul, jamais pendant un geste"). `BKLevelUpOverlay`
    /// observes this and clears it itself once the animation completes.
    private(set) var recentLevelUp: Int?

    init(profile: UserProfile) {
        self.profile = profile
    }

    func addXP(_ amount: Int) {
        let previousLevel = profile.level
        profile.totalXp += amount
        let result = GamificationCore.level(fromTotalXP: profile.totalXp)
        profile.level = result.level
        profile.xp = result.xp
        if result.level > previousLevel {
            recentLevelUp = result.level
        }
    }

    func update(_ mutate: (inout UserProfile) -> Void) {
        mutate(&profile)
    }

    func clearLevelUp() {
        recentLevelUp = nil
    }
}

extension InMemoryUserStore {
    static var preview: InMemoryUserStore { InMemoryUserStore(profile: .sample) }
}
