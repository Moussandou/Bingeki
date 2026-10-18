import Foundation
import Testing
@testable import Bingeki

/// Same cases as the web's `computeStreak` / `streakBonusXp`.
struct StreakTests {
    private let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Paris")!
        return calendar
    }()

    private func date(_ day: Int, _ hour: Int = 12, _ minute: Int = 0) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: 10, day: day, hour: hour, minute: minute))!
    }

    @Test func firstActivityStartsAtOne() {
        let result = GamificationCore.computeStreak(previous: 0, lastActivity: nil, now: date(1), calendar: calendar)
        #expect(result.streak == 1 && result.changed)
    }

    @Test func sameDayDoesNotChange() {
        let result = GamificationCore.computeStreak(previous: 4, lastActivity: date(1, 8), now: date(1, 22), calendar: calendar)
        #expect(result.streak == 4 && !result.changed)
    }

    @Test func nextCalendarDayIncrementsEvenAcrossMidnight() {
        let result = GamificationCore.computeStreak(previous: 4, lastActivity: date(1, 23, 59), now: date(2, 0, 1), calendar: calendar)
        #expect(result.streak == 5 && result.changed)
    }

    @Test func gapResetsToOne() {
        let result = GamificationCore.computeStreak(previous: 9, lastActivity: date(1), now: date(4), calendar: calendar)
        #expect(result.streak == 1 && result.changed)
    }

    @Test func bonusIsFivePerDayCappedAtHundred() {
        #expect(GamificationCore.streakBonusXP(1) == 0)
        #expect(GamificationCore.streakBonusXP(2) == 5)
        #expect(GamificationCore.streakBonusXP(10) == 45)
        #expect(GamificationCore.streakBonusXP(60) == 100)
    }
}
