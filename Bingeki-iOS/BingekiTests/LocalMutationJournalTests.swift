import Foundation
import Testing
@testable import Bingeki

@MainActor
struct LocalMutationJournalTests {
    private struct Payload: Codable, Equatable, Sendable {
        let progress: Int
        let bio: String
    }

    private typealias Journal = LocalMutationJournal<Payload>

    private func withDirectory(_ test: (URL) throws -> Void) throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("bingeki-journal-tests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        try test(directory)
    }

    private func file(in directory: URL) throws -> URL {
        let files = try FileManager.default.contentsOfDirectory(
            at: directory, includingPropertiesForKeys: nil
        )
        return try #require(files.first)
    }

    @Test func absentFileIsTheOnlyEmptyInitialState() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A")
            #expect(journal.revision == 0)
            #expect(journal.pending == nil)
            #expect(throws: Journal.JournalError.self) {
                try Journal(directory: directory, uid: "")
            }
        }
    }

    @Test func recordSurvivesImmediateReopenWithoutDebounce() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A")
            let first = try journal.record(Payload(progress: 1, bio: "a"))
            let second = try journal.record(Payload(progress: 2, bio: "ab"))
            #expect(first.revision == 1)
            #expect(second.revision == 2)
            let reopened = try Journal(directory: directory, uid: "A")
            #expect(reopened.pending == second)
            #expect(reopened.revision == 2)
        }
    }

    @Test func publicationFollowsPersistenceAndFailurePreservesPreviousEntry() throws {
        try withDirectory { directory in
            let initial = try Journal(directory: directory, uid: "A")
            let saved = try initial.record(Payload(progress: 1, bio: "saved"))
            var journal: Journal?
            var writeObserved = false
            journal = try Journal(directory: directory, uid: "A") { _, _ in
                #expect(journal?.pending == saved)
                #expect(journal?.revision == saved.revision)
                writeObserved = true
                throw CocoaError(.fileWriteOutOfSpace)
            }
            let current = try #require(journal)
            #expect(throws: CocoaError.self) {
                try current.record(Payload(progress: 2, bio: "not saved"))
            }
            #expect(writeObserved)
            #expect(current.pending == saved)
            #expect(current.revision == 1)
            #expect(try Journal(directory: directory, uid: "A").pending == saved)
        }
    }

    @Test func lateAcknowledgementCannotClearANewerRevision() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A")
            let first = try journal.record(Payload(progress: 1, bio: "a"))
            let second = try journal.record(Payload(progress: 2, bio: "ab"))
            #expect(try !journal.acknowledge(first.revision))
            #expect(journal.pending == second)
            #expect(try Journal(directory: directory, uid: "A").pending == second)
            #expect(throws: Journal.JournalError.self) { try journal.acknowledge(3) }
            #expect(journal.pending == second)
            #expect(try journal.acknowledge(second.revision))
            #expect(journal.pending == nil)
            #expect(try !journal.acknowledge(second.revision))
            let reopened = try Journal(directory: directory, uid: "A")
            #expect(reopened.pending == nil)
            #expect(reopened.revision == 2)
            let third = try reopened.record(Payload(progress: 3, bio: "abc"))
            #expect(third.revision == 3)
            #expect(try !reopened.acknowledge(second.revision))
            #expect(reopened.pending == third)
        }
    }

    @Test func successfulWriteIsReadableBeforePublishingTheNewEntry() throws {
        try withDirectory { directory in
            let initial = try Journal(directory: directory, uid: "A")
            let saved = try initial.record(Payload(progress: 1, bio: "saved"))
            let updated = Payload(progress: 2, bio: "new")
            var journal: Journal?
            var observed = false
            journal = try Journal(directory: directory, uid: "A") { data, url in
                #expect(journal?.pending == saved)
                try data.write(to: url, options: .atomic)
                let reopened = try Journal(directory: directory, uid: "A")
                #expect(reopened.pending?.payload == updated)
                #expect(reopened.revision == saved.revision + 1)
                #expect(journal?.pending == saved)
                observed = true
            }
            let current = try #require(journal)
            let entry = try current.record(updated)
            #expect(observed)
            #expect(current.pending == entry)
        }
    }

    @Test func failedAcknowledgementKeepsPendingOnDiskAndInMemory() throws {
        try withDirectory { directory in
            let initial = try Journal(directory: directory, uid: "A")
            let saved = try initial.record(Payload(progress: 1, bio: "saved"))
            let failing = try Journal(directory: directory, uid: "A") { _, _ in
                throw CocoaError(.fileWriteNoPermission)
            }
            #expect(throws: CocoaError.self) { try failing.acknowledge(saved.revision) }
            #expect(failing.pending == saved)
            #expect(try Journal(directory: directory, uid: "A").pending == saved)
        }
    }

    @Test func initialDiskFailureDoesNotAcceptAMutation() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A") { _, _ in
                throw CocoaError(.fileWriteOutOfSpace)
            }
            #expect(throws: CocoaError.self) {
                try journal.record(Payload(progress: 1, bio: "not saved"))
            }
            #expect(journal.pending == nil)
            #expect(journal.revision == 0)
            #expect(try Journal(directory: directory, uid: "A").pending == nil)
        }
    }

    @Test func accountsAndDomainsHaveSeparateFiles() throws {
        try withDirectory { directory in
            let a = try Journal(directory: directory, uid: "../A/+")
            let b = try Journal(directory: directory, uid: "../A/_")
            let savedA = try a.record(Payload(progress: 1, bio: "A"))
            let savedB = try b.record(Payload(progress: 9, bio: "B"))
            #expect(try Journal(directory: directory, uid: "../A/+").pending == savedA)
            #expect(try Journal(directory: directory, uid: "../A/_").pending == savedB)
            #expect(try a.acknowledge(savedA.revision))
            #expect(try Journal(directory: directory, uid: "../A/_").pending == savedB)
            let profileDirectory = directory.appendingPathComponent("profile", isDirectory: true)
            let profile = try Journal(directory: profileDirectory, uid: "../A/+")
            #expect(profile.pending == nil)
            let savedProfile = try profile.record(Payload(progress: 0, bio: "profile"))
            #expect(try Journal(directory: profileDirectory, uid: "../A/+").pending == savedProfile)
            #expect(try Journal(directory: directory, uid: "../A/+").pending == nil)
        }
    }

    @Test func corruptAndFutureDocumentsThrowWithoutOverwriting() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A")
            try journal.record(Payload(progress: 1, bio: "saved"))
            let url = try file(in: directory)
            let cases = [
                Data("{broken".utf8),
                Data(#"{"version":1,"uid":"A","revision":1,"hasPending":true,"payload":{"progress":"bad","bio":"x"}}"#.utf8),
                Data(#"{"version":2,"futurePayload":{"unknown":true}}"#.utf8),
                Data(#"{"version":1,"uid":"B","revision":1,"hasPending":false}"#.utf8),
                Data(#"{"version":1,"uid":"A","revision":0,"hasPending":true,"payload":"e30="}"#.utf8),
                Data(#"{"version":1,"uid":"A","revision":1,"hasPending":true}"#.utf8),
                Data(#"{"version":1,"uid":"A","revision":1,"hasPending":false,"payload":"e30="}"#.utf8),
                Data(#"{"version":1,"uid":"A","revision":1,"hasPending":true,"payload":"e30="}"#.utf8),
                Data(#"{"version":1,"uid":"A","revision":1}"#.utf8),
            ]
            for data in cases {
                try data.write(to: url, options: .atomic)
                #expect(throws: (any Error).self) { try Journal(directory: directory, uid: "A") }
                #expect(try Data(contentsOf: url) == data)
            }
        }
    }

    @Test func filesystemErrorsAreNotReportedAsAnEmptyJournal() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A")
            try journal.record(Payload(progress: 1, bio: "saved"))
            let url = try file(in: directory)
            try FileManager.default.removeItem(at: url)
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: false)
            #expect(throws: (any Error).self) { try Journal(directory: directory, uid: "A") }
        }
    }

    @Test func encodingFailureDoesNotPublishOrReplaceSavedData() throws {
        struct InvalidPayload: Codable, Sendable { let value: Double }
        try withDirectory { directory in
            let journal = try LocalMutationJournal<InvalidPayload>(directory: directory, uid: "A")
            try journal.record(InvalidPayload(value: 1))
            #expect(throws: EncodingError.self) { try journal.record(InvalidPayload(value: .nan)) }
            #expect(journal.revision == 1)
            #expect(journal.pending?.payload.value == 1)
            let reopened = try LocalMutationJournal<InvalidPayload>(directory: directory, uid: "A")
            #expect(reopened.pending?.payload.value == 1)
        }
    }

    @Test func optionalNilPayloadRemainsAPendingEntryUntilAcknowledged() throws {
        try withDirectory { directory in
            let journal = try LocalMutationJournal<String?>(directory: directory, uid: "A")
            let entry = try journal.record(nil)
            let reopened = try LocalMutationJournal<String?>(directory: directory, uid: "A")
            #expect(reopened.pending == entry)
            #expect(reopened.pending != nil)
            #expect(try reopened.acknowledge(entry.revision))
            #expect(try LocalMutationJournal<String?>(directory: directory, uid: "A").pending == nil)
        }
    }

    @Test func revisionOverflowThrowsWithoutChangingTheFile() throws {
        try withDirectory { directory in
            let journal = try Journal(directory: directory, uid: "A")
            try journal.record(Payload(progress: 1, bio: "saved"))
            let url = try file(in: directory)
            let data = Data(#"{"version":1,"uid":"A","revision":18446744073709551615,"hasPending":false}"#.utf8)
            try data.write(to: url, options: .atomic)
            let reopened = try Journal(directory: directory, uid: "A")
            #expect(throws: Journal.JournalError.self) {
                try reopened.record(Payload(progress: 2, bio: "next"))
            }
            #expect(reopened.revision == UInt64.max)
            #expect(reopened.pending == nil)
            #expect(try Data(contentsOf: url) == data)
        }
    }
}
