import Foundation
import Testing
@testable import Bingeki

struct TenraiModelTests {
    @Test func decodesTenraiMediaList() throws {
        let json = """
        {
            "data": [
                {
                    "mal_id": 5114,
                    "title": "Fullmetal Alchemist: Brotherhood",
                    "title_english": "Fullmetal Alchemist: Brotherhood",
                    "type": "TV",
                    "episodes": 64,
                    "status": "Finished Airing",
                    "score": 9.1,
                    "synopsis": "After a horrific alchemy experiment goes wrong...",
                    "year": 2009,
                    "images": {
                        "jpg": {
                            "image_url": "https://cdn.myanimelist.net/images/anime/1208/94745.jpg",
                            "small_image_url": "https://cdn.myanimelist.net/images/anime/1208/94745t.jpg"
                        }
                    },
                    "genres": [
                        {"mal_id": 1, "type": "anime", "name": "Action"},
                        {"mal_id": 2, "type": "anime", "name": "Adventure"}
                    ]
                }
            ],
            "pagination": {
                "last_visible_page": 1,
                "has_next_page": false
            }
        }
        """

        let response = try JSONDecoder.tenrai.decode(TenraiListResponse<TenraiMedia>.self, from: Data(json.utf8))
        #expect(response.data.count == 1)

        let media = response.data[0]
        #expect(media.malId == 5114)
        #expect(media.title == "Fullmetal Alchemist: Brotherhood")
        #expect(media.episodes == 64)
        #expect(media.year == 2009)
        #expect(media.genres?.count == 2)

        let work = media.asWork(mediaType: .anime)
        #expect(work.id == "5114")
        #expect(work.title == "Fullmetal Alchemist: Brotherhood")
        #expect(work.totalEpisodes == 64)
        #expect(work.genres == ["Action", "Adventure"])
        #expect(work.type == .anime)
        #expect(work.status == .planToRead)
    }

    @Test func decodesRecommendationResponse() throws {
        let json = """
        {
            "data": [
                {
                    "entry": {
                        "mal_id": 16498,
                        "url": "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
                        "images": {
                            "jpg": {
                                "image_url": "https://cdn.myanimelist.net/images/anime/10/47347.jpg"
                            }
                        },
                        "title": "Shingeki no Kyojin"
                    }
                }
            ]
        }
        """

        let response = try JSONDecoder.tenrai.decode(TenraiListResponse<TenraiRecommendationWrapper>.self, from: Data(json.utf8))
        #expect(response.data.count == 1)

        let rec = response.data[0]
        #expect(rec.entry.malId == 16498)
        #expect(rec.entry.title == "Shingeki no Kyojin")

        let work = rec.entry.asWork(mediaType: .anime)
        #expect(work.id == "16498")
        #expect(work.title == "Shingeki no Kyojin")
        #expect(work.type == .anime)
    }
}
