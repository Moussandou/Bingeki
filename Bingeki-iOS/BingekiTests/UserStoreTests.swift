import Testing
@testable import Bingeki

@MainActor
struct UserStoreTests {
    @Test func addXPCrossingALevelSetsRecentLevelUp() {
        let store = InMemoryUserStore(profile: UserProfile(uid: "t", level: 1, totalXp: 0))
        #expect(store.recentLevelUp == nil)
        store.addXP(GamificationCore.xpRequired(forLevel: 1))
        #expect(store.profile.level == 2)
        #expect(store.recentLevelUp == 2)
    }

    @Test func addXPWithoutCrossingALevelLeavesRecentLevelUpNil() {
        let store = InMemoryUserStore(profile: UserProfile(uid: "t", level: 1, totalXp: 0))
        store.addXP(5)
        #expect(store.recentLevelUp == nil)
    }

    @Test func clearLevelUpResetsTheEvent() {
        let store = InMemoryUserStore(profile: UserProfile(uid: "t", level: 1, totalXp: 0))
        store.addXP(GamificationCore.xpRequired(forLevel: 1))
        store.clearLevelUp()
        #expect(store.recentLevelUp == nil)
    }
}
