import Foundation

#if DEBUG
/// Rich demo library for screen recordings (`-bk.demoLibrary YES`).
/// Real titles and covers from Tenrai; no personal data.
extension Work {
    static let demoLibrary: [Work] = [
        Work(id: "59978", title: "Frieren — Saison 2", image: URL(string: "https://cdn.myanimelist.net/images/anime/1921/154528l.jpg"), type: .anime, totalEpisodes: 10, currentEpisode: 6, status: .reading, lastUpdated: Date(timeIntervalSinceNow: -7200), genres: ["Adventure", "Drama", "Fantasy"], year: 2026),
        Work(id: "116778", title: "Chainsaw Man", image: URL(string: "https://cdn.myanimelist.net/images/manga/3/216464l.jpg"), type: .manga, totalChapters: 232, currentChapter: 184, status: .reading, rating: 9, lastUpdated: Date(timeIntervalSinceNow: -18000), genres: ["Action", "Award Winning", "Fantasy"]),
        Work(id: "57334", title: "Dan Da Dan", image: URL(string: "https://cdn.myanimelist.net/images/anime/1584/143719l.jpg"), type: .anime, totalEpisodes: 12, currentEpisode: 8, status: .reading, lastUpdated: Date(timeIntervalSinceNow: -72000), genres: ["Action", "Comedy", "Supernatural"], year: 2024),
        Work(id: "13", title: "One Piece", image: URL(string: "https://cdn.myanimelist.net/images/manga/2/253146l.jpg"), type: .manga, totalChapters: nil, currentChapter: 1124, status: .reading, rating: 10, lastUpdated: Date(timeIntervalSinceNow: -108000), genres: ["Action", "Adventure", "Fantasy"]),
        Work(id: "51009", title: "Jujutsu Kaisen — Saison 2", image: URL(string: "https://cdn.myanimelist.net/images/anime/1792/138022l.jpg"), type: .anime, totalEpisodes: 23, currentEpisode: 15, status: .reading, lastUpdated: Date(timeIntervalSinceNow: -180000), genres: ["Action", "Supernatural"], year: 2023),
        Work(id: "38000", title: "Demon Slayer: Kimetsu no Yaiba", image: URL(string: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg"), type: .anime, totalEpisodes: 26, currentEpisode: 0, status: .planToRead, lastUpdated: Date(timeIntervalSinceNow: -252000), genres: ["Action", "Award Winning", "Supernatural"], year: 2019),
        Work(id: "44347", title: "One-Punch Man", image: URL(string: "https://cdn.myanimelist.net/images/manga/3/80661l.jpg"), type: .manga, totalChapters: nil, currentChapter: 0, status: .planToRead, lastUpdated: Date(timeIntervalSinceNow: -324000), genres: ["Action", "Comedy"]),
        Work(id: "52991", title: "Frieren", image: URL(string: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg"), type: .anime, totalEpisodes: 28, currentEpisode: 28, status: .completed, rating: 10, lastUpdated: Date(timeIntervalSinceNow: -720000), genres: ["Adventure", "Award Winning", "Drama"], year: 2023),
        Work(id: "121496", title: "Solo Leveling", image: URL(string: "https://cdn.myanimelist.net/images/manga/3/222295l.jpg"), type: .manga, totalChapters: 201, currentChapter: 201, status: .completed, rating: 9, lastUpdated: Date(timeIntervalSinceNow: -1080000), genres: ["Action", "Adventure", "Fantasy"]),
        Work(id: "40748", title: "Jujutsu Kaisen", image: URL(string: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg"), type: .anime, totalEpisodes: 24, currentEpisode: 24, status: .completed, rating: 8, lastUpdated: Date(timeIntervalSinceNow: -1440000), genres: ["Action", "Award Winning", "Supernatural"], year: 2020),
        Work(id: "2", title: "Berserk", image: URL(string: "https://cdn.myanimelist.net/images/manga/1/157897l.jpg"), type: .manga, totalChapters: nil, currentChapter: 120, status: .onHold, lastUpdated: Date(timeIntervalSinceNow: -2160000), genres: ["Action", "Adventure", "Award Winning"]),
    ]
}

extension UserProfile {
    static let demo: UserProfile = {
        var p = UserProfile.sample
        p.streak = 17
        p.banner = "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg"
        p.top3Favorites = ["52991", "116778", "2"]
        return p
    }()
}
#endif
