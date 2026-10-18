import Foundation
import Testing
@testable import Bingeki

@MainActor
struct LibrarySearchTests {
    private var fixtures: [Work] {
        [
            Work(id: "1", title: "Étoile", titleEnglish: "Star", titleJapanese: "星",
                 type: .anime, totalEpisodes: 10, currentEpisode: 5, status: .reading, rating: 8),
            Work(id: "2", title: "Étoile du soir", type: .manga,
                 totalChapters: 20, currentChapter: 10, status: .reading, rating: 8),
            Work(id: "3", title: "Étoile", type: .anime, status: .completed, rating: 9),
            Work(id: "4", title: "Autre titre", type: .manga,
                 status: .reading, synopsis: "Étoile dans le synopsis"),
            Work(id: "5", title: "E\u{301}TOILE", type: .anime,
                 totalEpisodes: 10, currentEpisode: 5, status: .reading, rating: 8)
        ]
    }

    @Test func matchesCaseAccentsAndSurroundingWhitespace() {
        for query in ["etoile", "ÉTOILE", "  étoile\n", "e\u{301}toile"] {
            #expect(LibrarySearch.filter(fixtures, query: query).map(\.id) == ["1", "2", "3", "5"])
        }
        #expect(LibrarySearch.filter(fixtures, query: "soir").map(\.id) == ["2"])
    }

    @Test func searchesOnlyAvailableTitles() {
        #expect(LibrarySearch.filter(fixtures, query: "STAR").map(\.id) == ["1"])
        #expect(LibrarySearch.filter(fixtures, query: "星").map(\.id) == ["1"])
        #expect(LibrarySearch.filter(fixtures, query: "synopsis").isEmpty)
        #expect(LibrarySearch.filter(fixtures, query: "absent").isEmpty)
    }

    @Test func combinesStatusTypeAndQueryWithoutMutatingStore() {
        let store = InMemoryLibraryStore(seed: fixtures)
        let before = store.works
        let reading = store.works(status: .reading)
        #expect(LibrarySearch.filter(reading, query: "etoile", type: .anime).map(\.id) == ["1", "5"])
        #expect(LibrarySearch.filter(reading, query: "etoile", type: .manga).map(\.id) == ["2"])
        #expect(LibrarySearch.filter(store.works(status: .completed), query: "etoile").map(\.id) == ["3"])
        #expect(LibrarySearch.filter(store.works(status: .onHold), query: "etoile").isEmpty)
        #expect(store.works == before)
    }

    @Test func emptyOrClearedQueryRestoresInputExactly() {
        for query in ["", " \n\t "] {
            #expect(!LibrarySearch.hasQuery(query))
            #expect(LibrarySearch.filter(fixtures, query: query) == fixtures)
        }
        #expect(LibrarySearch.hasQuery("titre"))
        #expect(LibrarySearch.filter(fixtures, query: "", type: .manga).map(\.id) == ["2", "4"])
    }

    @Test func keepsSortOrderAndStableTies() {
        let matches = LibrarySearch.filter(fixtures.filter { $0.status == .reading }, query: "etoile")
        for sort in [LibrarySort.recent, .rating, .progress] {
            #expect(sort.apply(to: matches).map(\.id) == ["1", "2", "5"])
        }
        #expect(LibrarySort.title.apply(to: matches).map(\.id) == ["1", "5", "2"])
        for sort in LibrarySort.allCases {
            #expect(sort.apply(to: LibrarySearch.filter(fixtures, query: "")) == sort.apply(to: fixtures))
        }
    }
}
