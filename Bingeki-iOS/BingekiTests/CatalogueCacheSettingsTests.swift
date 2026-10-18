import Foundation
import Testing
@testable import Bingeki

@MainActor
struct CatalogueCacheSettingsTests {
    @Test func measuresAndPurgesSuccessfully() async {
        let model = CatalogueCacheSettingsModel(cache: RetryCache())
        await model.perform(.measure)
        #expect(model.statistics == .init(payloadCount: 2, payloadBytes: 123))
        #expect(!model.isBusy)
        #expect(!model.didPurge)

        await model.perform(.purge)
        #expect(model.statistics == .init(payloadCount: 0, payloadBytes: 0))
        #expect(model.didPurge)
        #expect(model.errorMessage == nil)
        #expect(model.failedAction == nil)
        #expect(!model.isBusy)
    }

    @Test func failedMeasurementIsVisibleAndRetryableWithoutFalseEmptyState() async {
        let model = CatalogueCacheSettingsModel(cache: RetryCache(measureFailures: 1))
        await model.perform(.measure)
        #expect(model.statistics == nil)
        #expect(model.errorMessage == "Lecture impossible")
        #expect(model.failedAction == .measure)
        #expect(!model.isBusy)

        await model.perform(.measure)
        #expect(model.statistics == .init(payloadCount: 2, payloadBytes: 123))
        #expect(model.errorMessage == nil)
        #expect(model.failedAction == nil)
    }

    @Test func failedPurgeDoesNotReportSuccessAndCanBeRetried() async {
        let model = CatalogueCacheSettingsModel(cache: RetryCache(purgeFailures: 1))
        await model.perform(.purge)
        #expect(model.statistics == nil)
        #expect(!model.didPurge)
        #expect(model.errorMessage == "Suppression impossible")
        #expect(model.failedAction == .purge)
        #expect(!model.isBusy)

        await model.perform(.purge)
        #expect(model.didPurge)
        #expect(model.statistics == .init(payloadCount: 0, payloadBytes: 0))
        #expect(model.errorMessage == nil)
    }

    @Test func measurementFailureAfterPurgeRetriesOnlyMeasurement() async {
        let cache = RetryCache(measureFailures: 1)
        let model = CatalogueCacheSettingsModel(cache: cache)
        await model.perform(.purge)
        #expect(model.didPurge)
        #expect(model.statistics == nil)
        #expect(model.errorMessage == "Lecture impossible")
        #expect(model.failedAction == .measure)

        await model.perform(.measure)
        #expect(await cache.purgeCalls == 1)
        #expect(model.statistics == .init(payloadCount: 0, payloadBytes: 0))
        #expect(model.errorMessage == nil)
    }

    @Test func unavailableCacheDoesNotPretendToBeEmptyOrPurged() async {
        let model = CatalogueCacheSettingsModel(cache: nil)
        await model.perform(.measure)
        #expect(model.statistics == nil)
        #expect(model.errorMessage != nil)
        await model.perform(.purge)
        #expect(!model.didPurge)
        #expect(model.statistics == nil)
        #expect(model.errorMessage != nil)
        #expect(!model.isBusy)
    }
}

private actor RetryCache: CatalogueCacheManaging {
    private var measureFailures: Int
    private var purgeFailures: Int
    private var value = ResponseCache.Statistics(payloadCount: 2, payloadBytes: 123)
    private(set) var purgeCalls = 0

    init(measureFailures: Int = 0, purgeFailures: Int = 0) {
        self.measureFailures = measureFailures
        self.purgeFailures = purgeFailures
    }

    func statistics() throws -> ResponseCache.Statistics {
        if measureFailures > 0 {
            measureFailures -= 1
            throw CacheFailure.measure
        }
        return value
    }

    func purge() throws {
        purgeCalls += 1
        if purgeFailures > 0 {
            purgeFailures -= 1
            throw CacheFailure.purge
        }
        value = .init(payloadCount: 0, payloadBytes: 0)
    }
}

private enum CacheFailure: LocalizedError {
    case measure, purge

    var errorDescription: String? {
        self == .measure ? "Lecture impossible" : "Suppression impossible"
    }
}
