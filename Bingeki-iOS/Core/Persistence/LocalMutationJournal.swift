import Foundation

/// One live owner per (directory, UID). Use a separate directory for each
/// mutation domain. Payloads are absolute pending state, not replayable deltas.
/// Callers must publish UI state only after record succeeds, and acknowledge
/// only a server-confirmed revision. Errors propagate; no corrupt-file reset.
/// Atomic replacement protects against partial files, not physical power loss.
@MainActor
final class LocalMutationJournal<Payload: Codable & Sendable> {
    struct Entry: Sendable {
        let revision: UInt64
        let payload: Payload
    }

    enum JournalError: Error, LocalizedError {
        case emptyUID
        case unsupportedVersion(Int)
        case accountMismatch
        case invalidRevision
        case revisionOverflow
        case futureAcknowledgement(requested: UInt64, current: UInt64)

        var errorDescription: String? {
            switch self {
            case .emptyUID: "A journal requires a nonempty account UID."
            case .unsupportedVersion(let version): "Unsupported local journal version: \(version)."
            case .accountMismatch: "The local journal belongs to a different account."
            case .invalidRevision: "The local journal has an invalid revision."
            case .revisionOverflow: "The local journal revision cannot be advanced."
            case .futureAcknowledgement(let requested, let current):
                "Cannot acknowledge revision \(requested) beyond current revision \(current)."
            }
        }
    }

    private struct Header: Decodable {
        let version: Int
    }

    private struct Document: Codable {
        let version: Int
        let uid: String
        let revision: UInt64
        let hasPending: Bool
        let payload: Data?
    }

    private(set) var revision: UInt64
    private(set) var pending: Entry?
    private let uid: String
    private let fileURL: URL
    private let write: (Data, URL) throws -> Void

    init(
        directory: URL,
        uid: String,
        write: @escaping (Data, URL) throws -> Void = { data, url in
            try FileManager.default.createDirectory(
                at: url.deletingLastPathComponent(), withIntermediateDirectories: true
            )
            try data.write(to: url, options: .atomic)
        }
    ) throws {
        guard !uid.isEmpty else { throw JournalError.emptyUID }
        self.uid = uid
        self.write = write
        let name = Data(uid.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "=", with: "")
        fileURL = directory.appendingPathComponent(name + ".json", isDirectory: false)

        let data: Data
        do {
            data = try Data(contentsOf: fileURL)
        } catch let error as NSError
            where error.domain == NSCocoaErrorDomain && error.code == NSFileReadNoSuchFileError {
            revision = 0
            pending = nil
            return
        }
        let decoder = JSONDecoder()
        let version = try decoder.decode(Header.self, from: data).version
        guard version == 1 else { throw JournalError.unsupportedVersion(version) }
        let document = try decoder.decode(Document.self, from: data)
        guard document.uid == uid else { throw JournalError.accountMismatch }
        guard document.revision > 0, document.hasPending == (document.payload != nil) else {
            throw JournalError.invalidRevision
        }
        revision = document.revision
        pending = try document.payload.map {
            Entry(revision: document.revision, payload: try decoder.decode(Payload.self, from: $0))
        }
    }

    /// Returns only after atomic persistence; a thrown encoding/disk error
    /// leaves the previously published entry and revision unchanged.
    @discardableResult
    func record(_ payload: Payload) throws -> Entry {
        guard revision < UInt64.max else { throw JournalError.revisionOverflow }
        let next = Entry(revision: revision + 1, payload: payload)
        try persist(revision: next.revision, payload: payload)
        revision = next.revision
        pending = next
        return next
    }

    /// Only the exact current revision can be cleared by its server receipt.
    /// Keep the revision on disk so a restart cannot reuse an old receipt.
    @discardableResult
    func acknowledge(_ acknowledged: UInt64) throws -> Bool {
        guard acknowledged <= revision else {
            throw JournalError.futureAcknowledgement(requested: acknowledged, current: revision)
        }
        guard acknowledged == revision, pending != nil else { return false }
        try persist(revision: revision, payload: nil)
        pending = nil
        return true
    }

    private func persist(revision: UInt64, payload: Payload?) throws {
        let document = Document(
            version: 1, uid: uid, revision: revision,
            hasPending: payload != nil,
            payload: try payload.map { try JSONEncoder().encode($0) }
        )
        try write(JSONEncoder().encode(document), fileURL)
    }
}

extension LocalMutationJournal.Entry: Equatable where Payload: Equatable {}
