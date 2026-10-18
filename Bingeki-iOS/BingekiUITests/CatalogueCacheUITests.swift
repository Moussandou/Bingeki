import XCTest

final class CatalogueCacheUITests: XCTestCase {
    @MainActor
    func testCacheSectionConfirmsCancelsAndPurgesAtAccessibilityTextSize() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = [
            "-bk.mockAuth", "YES",
            "-bk.useInMemoryStore", "YES",
            "-bk.skipOnboarding", "YES",
            "-bk.openProfile", "YES",
            "-bk.forceOffline", "YES",
            "-AppleLanguages", "(fr)",
            "-AppleLocale", "fr_FR",
            "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"
        ]
        app.launch()
        app.waitForIntroToFinish()
        app.buttons["Réglages"].tap()

        let scroll = app.scrollViews.firstMatch
        let purge = app.buttons["catalogue_cache_purge"]
        for _ in 0..<12 {
            if purge.isHittable { break }
            scroll.swipeUp()
        }
        XCTAssertTrue(purge.isHittable)
        let statistics = app.descendants(matching: .any)["catalogue_cache_statistics"]
        XCTAssertTrue(statistics.waitForExistence(timeout: 5))
        let initialValue = statistics.label

        purge.tap()
        app.buttons["Annuler"].tap()
        XCTAssertEqual(statistics.label, initialValue)
        XCTAssertFalse(app.staticTexts["catalogue_cache_success"].exists)

        for _ in 0..<2 {
            purge.tap()
            let confirm = app.buttons.matching(NSPredicate(
                format: "label == %@ AND identifier != %@",
                "Vider le cache catalogue", "catalogue_cache_purge"
            )).firstMatch
            XCTAssertTrue(confirm.waitForExistence(timeout: 3))
            confirm.tap()
            XCTAssertTrue(app.staticTexts["catalogue_cache_success"].waitForExistence(timeout: 5))
            XCTAssertTrue(statistics.label.contains("Payloads : 0"))
            XCTAssertTrue(statistics.label.contains("Octets des payloads : 0"))
            if !purge.isHittable { scroll.swipeUp() }
        }
    }
}
