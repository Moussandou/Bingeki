import Testing
@testable import Bingeki

/// Parity checks against `src/shared/gamificationCore.ts` — keep both in
/// sync manually until a shared codegen exists (see the handoff doc §9).
struct GamificationCoreTests {
    @Test func firstLevelRequiresBaseXP() {
        #expect(GamificationCore.xpRequired(forLevel: 1) == 100)
    }

    @Test func levelUpConsumesExactlyTheRequirement() {
        let result = GamificationCore.level(fromTotalXP: 100)
        #expect(result.level == 2)
        #expect(result.xp == 0)
    }

    @Test func rankThresholdsMatchWebRankUtils() {
        #expect(GamificationCore.rank(forLevel: 1) == "F")
        #expect(GamificationCore.rank(forLevel: 5) == "E")
        #expect(GamificationCore.rank(forLevel: 10) == "D")
        #expect(GamificationCore.rank(forLevel: 100) == "臭")
    }

    @Test func progressIncrementCompletesWorkAtTotal() {
        var work = Work(id: "1", title: "Test", type: .anime, totalEpisodes: 12, currentEpisode: 11, status: .reading)
        work.incrementProgress(by: 1)
        #expect(work.currentEpisode == 12)
        #expect(work.status == .completed)
    }

    @Test func progressIncrementNeverExceedsTotal() {
        var work = Work(id: "2", title: "Test", type: .manga, totalChapters: 10, currentChapter: 9, status: .reading)
        work.incrementProgress(by: 5)
        #expect(work.currentChapter == 10)
    }
}
