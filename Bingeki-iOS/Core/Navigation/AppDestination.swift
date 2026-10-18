import Foundation

enum AppDestination: Hashable, Sendable {
    enum WorkType: String, Hashable, Sendable {
        case anime, manga
    }

    case work(type: WorkType, id: Int)
    case profile(uid: String)

    enum ParseResult: Equatable, Sendable {
        case destination(AppDestination)
        case invalid
        case unsupported
    }

    /// Pure parsing only: a destination does not grant access to its content.
    /// Invalid means malformed, ambiguous, or outside the allowed HTTPS origin.
    /// Unsupported means a canonical-origin route, language, query, or fragment
    /// that the native destination model cannot represent.
    ///
    /// Existing work shares emit only `type`; profile shares emit no parameters.
    /// Unknown query parameters (including tracking) and all fragments remain
    /// unsupported rather than silently losing web behavior.
    static func parse(_ value: String) -> ParseResult {
        guard !value.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) }),
              let decoded = value.removingPercentEncoding,
              !decoded.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              let components = URLComponents(string: value, encodingInvalidCharacters: false),
              components.scheme?.lowercased() == "https",
              components.percentEncodedHost?.lowercased() == "bingeki.web.app",
              components.user == nil, components.password == nil,
              components.port == nil || components.port == 443,
              let authority = value.components(separatedBy: "://").dropFirst().first?.split(separator: "/").first,
              !authority.hasSuffix(":") else {
            return .invalid
        }

        let path = components.percentEncodedPath.components(separatedBy: "/")
        var segments: [String] = []
        for component in path {
            guard let segment = component.removingPercentEncoding,
                  !segment.contains("/"), !segment.contains("\\"),
                  segment != ".", segment != ".." else {
                return .invalid
            }
            // Decode exactly once; reject nested escapes instead of passing
            // ambiguous identifiers to a future router that may decode again.
            if let unescaped = segment.removingPercentEncoding, unescaped != segment {
                return .invalid
            }
            segments.append(segment)
        }

        guard path.count >= 3, path[0].isEmpty,
              ["fr", "en"].contains(path[1]),
              ["work", "profile"].contains(path[2]) else {
            return .unsupported
        }
        guard path.count == 4, !segments[3].isEmpty else { return .invalid }

        let items = components.queryItems ?? []
        let destination: AppDestination
        switch path[2] {
        case "work":
            let types = items.filter { $0.name == "type" }
            guard segments[3].utf8.allSatisfy({ (48...57).contains($0) }),
                  let id = Int(segments[3]), id > 0, String(id) == segments[3],
                  types.count == 1, let value = types[0].value,
                  let type = WorkType(rawValue: value) else {
                return .invalid
            }
            guard items.allSatisfy({ $0.name == "type" }) else { return .unsupported }
            destination = .work(type: type, id: id)
        default:
            guard segments[3].utf16.count <= 128 else { return .invalid }
            guard items.isEmpty else { return .unsupported }
            destination = .profile(uid: segments[3])
        }
        guard components.fragment == nil else { return .unsupported }
        return .destination(destination)
    }

    static func parse(_ url: URL) -> ParseResult {
        parse(url.absoluteString)
    }
}
