import Foundation
import Testing
@testable import Bingeki

struct BadgeDecodingTests {
    @Test func decodesWebBadgeShape() throws {
        let json = #"{"id":"streak_30","name":"Inarrêtable","description":"30 jours","icon":"crown","rarity":"legendary","unlockedAt":1790000000000}"#
        let badge = try JSONDecoder().decode(Badge.self, from: Data(json.utf8))
        #expect(badge.rarity == .legendary)
        #expect(badge.symbolName == "crown.fill")
        #expect(badge.unlockedAt == Date(timeIntervalSince1970: 1_790_000_000))
    }

    @Test func unknownIconAndRarityFallBack() throws {
        let json = #"{"id":"x","icon":"sparkles-unknown","rarity":"mythic"}"#
        let badge = try JSONDecoder().decode(Badge.self, from: Data(json.utf8))
        #expect(badge.symbolName == "star.fill")
        #expect(badge.rarity == .common)
        #expect(badge.name == "x")
    }

    @Test func malformedBadgesDoNotBreakTheProfile() throws {
        let json = #"{"uid":"u1","level":3,"badges":"not-an-array"}"#
        let profile = try JSONDecoder().decode(UserProfile.self, from: Data(json.utf8))
        #expect(profile.level == 3)
        #expect(profile.badges.isEmpty)
    }
}
