import Foundation
import Testing
@testable import Bingeki

struct WorkModelTests {
    @Test func decodesFirestoreWebFormatWithNumericIdAndGenreObjects() throws {
        let json = """
        {
            "id": 52991,
            "title": "Sousou no Frieren",
            "title_english": "Frieren: Beyond Journey's End",
            "type": "anime",
            "totalEpisodes": 28,
            "currentEpisode": 14,
            "status": "reading",
            "genres": [
                {"name": "Aventure"},
                {"name": "Fantasy"}
            ],
            "lastUpdated": 1710000000000,
            "dateAdded": 1709000000000
        }
        """

        let work = try JSONDecoder().decode(Work.self, from: Data(json.utf8))
        #expect(work.id == "52991")
        #expect(work.title == "Sousou no Frieren")
        #expect(work.titleEnglish == "Frieren: Beyond Journey's End")
        #expect(work.type == .anime)
        #expect(work.totalEpisodes == 28)
        #expect(work.currentEpisode == 14)
        #expect(work.status == .reading)
        #expect(work.genres == ["Aventure", "Fantasy"])
        #expect(work.lastUpdated == Date(timeIntervalSince1970: 1_710_000_000))
        #expect(work.dateAdded == Date(timeIntervalSince1970: 1_709_000_000))
    }

    @Test func decodesStringIdFallback() throws {
        let json = """
        {
            "id": "custom-uuid-123",
            "title": "Solo Leveling",
            "type": "manga",
            "status": "plan_to_read"
        }
        """

        let work = try JSONDecoder().decode(Work.self, from: Data(json.utf8))
        #expect(work.id == "custom-uuid-123")
        #expect(work.status == .planToRead)
    }

    @Test func encodesToFirestoreFormatWithGenreRefsAndEpochDates() throws {
        var work = Work(
            id: "12345",
            title: "One Piece",
            type: .anime,
            totalEpisodes: 1100,
            currentEpisode: 500,
            status: .reading
        )
        work.genres = ["Shōnen", "Action"]
        work.lastUpdated = Date(timeIntervalSince1970: 1_700_000_000)

        let data = try JSONEncoder().encode(work)
        guard let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            Issue.record("Failed to parse JSON dict")
            return
        }

        #expect(jsonObject["id"] as? String == "12345")
        #expect(jsonObject["lastUpdated"] as? Double == 1_700_000_000_000)
        let genres = jsonObject["genres"] as? [[String: Any]]
        #expect(genres?.count == 2)
        #expect(genres?.first?["name"] as? String == "Shōnen")
    }

    @Test func progressFractionComputation() {
        let anime = Work(id: "1", title: "A", type: .anime, totalEpisodes: 24, currentEpisode: 6, status: .reading)
        #expect(anime.progressFraction == 0.25)

        let noTotal = Work(id: "2", title: "B", type: .manga, status: .reading)
        #expect(noTotal.progressFraction == 0.0)

        let overflow = Work(id: "3", title: "C", type: .anime, totalEpisodes: 12, currentEpisode: 12, status: .completed)
        #expect(overflow.progressFraction == 1.0)
    }

    @Test func incrementProgressTransitionsStatus() {
        var work = Work(id: "1", title: "Test", type: .anime, totalEpisodes: 12, currentEpisode: 0, status: .planToRead)
        work.incrementProgress(by: 1)
        #expect(work.currentEpisode == 1)
        #expect(work.status == .reading)

        work.incrementProgress(by: 11)
        #expect(work.currentEpisode == 12)
        #expect(work.status == .completed)

        // Does not exceed total
        work.incrementProgress(by: 5)
        #expect(work.currentEpisode == 12)
    }
}
