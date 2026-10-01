import Foundation
import Testing
@testable import Bingeki

struct UserProfileTests {
    @Test func defensiveDecodingWithMinimalFirestoreDoc() throws {
        let json = """
        {
            "uid": "user_abc_123"
        }
        """

        let profile = try JSONDecoder().decode(UserProfile.self, from: Data(json.utf8))
        #expect(profile.uid == "user_abc_123")
        #expect(profile.level == 1)
        #expect(profile.xp == 0)
        #expect(profile.totalXp == 0)
        #expect(profile.streak == 0)
        #expect(profile.themeColor == "#FF2E63")
        #expect(profile.cardBgColor == "#0F1424")
        #expect(profile.borderColor == "#000000")
        #expect(profile.profileVisibility == .public)
        #expect(profile.showActivityStatus == true)
        #expect(profile.hideScores == false)
        #expect(profile.dataSaver == false)
        #expect(profile.nsfwMode == false)
        #expect(profile.badges.isEmpty)
    }

    @Test func defensiveDecodingWithCustomFields() throws {
        let json = """
        {
            "uid": "user_xyz",
            "displayName": "Luffy",
            "themeColor": "#08D9D6",
            "profileVisibility": "private",
            "nsfwMode": true,
            "totalChaptersRead": 1050,
            "badges": [
                {
                    "id": "collector_5",
                    "name": "Collectionneur",
                    "icon": "library",
                    "rarity": "common"
                }
            ]
        }
        """

        let profile = try JSONDecoder().decode(UserProfile.self, from: Data(json.utf8))
        #expect(profile.displayName == "Luffy")
        #expect(profile.themeColor == "#08D9D6")
        #expect(profile.profileVisibility == .private)
        #expect(profile.nsfwMode == true)
        #expect(profile.totalChaptersRead == 1050)
        #expect(profile.badges.count == 1)
        #expect(profile.badges.first?.id == "collector_5")
    }

    @Test func nenAxesCalculationCoversAllSixAxes() {
        let profile = UserProfile(
            uid: "test",
            xp: 50,
            level: 10,
            streak: 7,
            totalChaptersRead: 150,
            totalWorksAdded: 20,
            totalWorksCompleted: 5
        )

        let axes = GamificationCore.nenAxes(for: profile)
        #expect(axes.count == 6)
        let labels = axes.map(\.label)
        #expect(labels.contains("Niveau"))
        #expect(labels.contains("Passion"))
        #expect(labels.contains("Assiduité"))
        #expect(labels.contains("Collection"))
        #expect(labels.contains("Lecture"))
        #expect(labels.contains("Complétion"))

        // Values bounded between 0 and 100
        for axis in axes {
            #expect(axis.value >= 0 && axis.value <= 100)
        }
    }
}
