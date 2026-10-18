import Foundation

/// Read-only title filtering; preserves the store's ordering and work identities.
enum LibrarySearch {
    private static func normalized(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "fr_FR"))
    }

    static func hasQuery(_ query: String) -> Bool {
        !normalized(query).isEmpty
    }

    static func filter(_ works: [Work], query: String, type: WorkType? = nil) -> [Work] {
        let needle = normalized(query)
        return works.filter { work in
            guard type == nil || work.type == type else { return false }
            return needle.isEmpty || [work.title, work.titleEnglish, work.titleJapanese]
                .compactMap { $0 }
                .contains { normalized($0).contains(needle) }
        }
    }
}
