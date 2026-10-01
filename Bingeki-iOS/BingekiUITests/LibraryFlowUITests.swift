import XCTest

final class LibraryFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLibraryTabsAndProgressSheetOpen() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-bk.mockAuth", "YES",
            "-bk.useInMemoryStore", "YES",
            "-bk.onboardingDone", "YES",
            "-bk.initialTab", "library",
            "-AppleLanguages", "(fr)",
            "-AppleLocale", "fr_FR"
        ]
        app.launch()

        // 1. Verify on Library Tab
        let biblioHeader = app.staticTexts["Biblio"]
        XCTAssertTrue(biblioHeader.waitForExistence(timeout: 5), "L'écran Biblio doit être affiché")

        // 2. Type tabs exist
        let toutTab = app.buttons["TOUT"]
        let animeTab = app.buttons["ANIME"]
        let mangaTab = app.buttons["MANGA"]

        XCTAssertTrue(toutTab.exists, "L'onglet de filtre 'TOUT' doit exister")
        XCTAssertTrue(animeTab.exists, "L'onglet de filtre 'ANIME' doit exister")
        XCTAssertTrue(mangaTab.exists, "L'onglet de filtre 'MANGA' doit exister")

        // Switch to ANIME
        animeTab.tap()

        // Switch back to TOUT
        toutTab.tap()

        // 3. Open progress sheet for a sample work if present
        let sampleRow = app.staticTexts["Sousou no Frieren"]
        if sampleRow.waitForExistence(timeout: 3) {
            sampleRow.tap()

            // Verify sheet opened
            let plusOneBtn = app.buttons["+1"]
            XCTAssertTrue(plusOneBtn.waitForExistence(timeout: 3), "Le bouton d'incrément rapide '+1' doit être présent sur la sheet de progression")
        }
    }
}
