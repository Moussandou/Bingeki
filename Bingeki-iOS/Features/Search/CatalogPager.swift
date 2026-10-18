import Foundation
import Observation

struct CatalogPage {
    var works: [Work]
    var hasMore: Bool
}

/// Each source commits its cursor only after a successful response.
@MainActor
@Observable
final class CatalogPager<Source: Hashable> {
    private(set) var works: [Work] = []
    private(set) var failures: Set<Source> = []
    private(set) var isLoading = false
    private(set) var hasLoaded = false
    private var pages: [Source: Int] = [:]
    private var exhausted: Set<Source> = []
    private var generation = UUID()
    private let sources: [Source]
    private let fetch: @MainActor (Source, Int, Bool) async throws -> CatalogPage

    init(sources: [Source], fetch: @escaping @MainActor (Source, Int, Bool) async throws -> CatalogPage) {
        self.sources = sources
        self.fetch = fetch
    }

    var hasMore: Bool { sources.contains { !exhausted.contains($0) } }
    var canLoadMore: Bool { sources.contains { !exhausted.contains($0) && !failures.contains($0) } }

    func reset() {
        generation = UUID()
        works = []
        failures = []
        pages = [:]
        exhausted = []
        isLoading = false
        hasLoaded = false
    }

    func load(sfw: Bool, retry: Bool = false, emptyPageLimit: Int = 1) async {
        guard !isLoading else { return }
        let token = generation
        let selected = sources.filter {
            !exhausted.contains($0) && (retry ? failures.contains($0) : !failures.contains($0))
        }
        guard !selected.isEmpty else { return }
        isLoading = true
        defer { if generation == token { isLoading = false } }
        for source in selected {
            for _ in 0..<max(1, emptyPageLimit) {
                let page = (pages[source] ?? 0) + 1
                do {
                    let response = try await fetch(source, page, sfw)
                    guard generation == token, !Task.isCancelled else { return }
                    var seen = Set(works.map(\.identity))
                    let fresh = response.works.filter { seen.insert($0.identity).inserted }
                    works += fresh
                    pages[source] = page
                    failures.remove(source)
                    hasLoaded = true
                    if !response.hasMore { exhausted.insert(source) }
                    if !fresh.isEmpty || !response.hasMore { break }
                } catch {
                    guard generation == token, !Task.isCancelled else { return }
                    failures.insert(source)
                    break
                }
            }
        }
    }
}
