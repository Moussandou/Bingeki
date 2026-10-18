import Foundation
import Testing
@testable import Bingeki

@MainActor
struct DiscoverDeckTests {
    private func deck(_ defaults: UserDefaults) -> DiscoverDeck {
        let pool = (1...10).map { Work(id: "\($0)", title: "T\($0)", type: .anime, status: .planToRead) }
        return DiscoverDeck(defaults: defaults, pool: pool)
    }

    /// Like a TikTok feed: pages scrolled past don't come back next session.
    @Test func scrollingDownMarksPagesAsSeen() throws {
        let defaults = try #require(UserDefaults(suiteName: "deck-\(UUID().uuidString)"))
        let deck = deck(defaults)

        deck.setIndex(3)
        #expect(defaults.stringArray(forKey: "bk.discover.seen") == ["anime:1", "anime:2", "anime:3"])

        // Scrolling back up to re-watch doesn't unsee anything or duplicate.
        deck.setIndex(1)
        deck.setIndex(3)
        #expect(defaults.stringArray(forKey: "bk.discover.seen") == ["anime:1", "anime:2", "anime:3"])
    }
}
