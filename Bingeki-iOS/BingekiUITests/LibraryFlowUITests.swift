import XCTest

final class LibraryFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testLocalSearchFiltersResetsSelectionAndKeepsCatalogAccess() {
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
        app.waitForIntroToFinish()

        let search = app.textFields["library_local_search"]
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["library_catalog_search"].exists)
        search.tap()
        search.typeText("FRIEREN\n")
        XCTAssertTrue(app.staticTexts["Frieren — Saison 2"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.staticTexts["One Piece"].exists)

        app.buttons["MANGA"].tap()
        XCTAssertTrue(app.staticTexts["library_search_empty"].waitForExistence(timeout: 3))
        app.buttons["library_clear_search"].tap()
        XCTAssertTrue(app.staticTexts["One Piece"].waitForExistence(timeout: 3))

        app.buttons["TOUT"].tap()
        app.buttons["library_select_button"].tap()
        app.buttons.containing(.staticText, identifier: "One Piece").firstMatch.tap()
        XCTAssertTrue(app.staticTexts["1 sélectionné"].exists)
        search.tap()
        search.typeText("introuvable\n")
        XCTAssertTrue(app.staticTexts["library_search_empty"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["0 sélectionné"].exists)
        app.buttons["library_clear_search"].tap()
        XCTAssertTrue(app.staticTexts["One Piece"].waitForExistence(timeout: 3))
        app.buttons["library_select_done"].tap()
        app.buttons["library_catalog_search"].tap()
        XCTAssertTrue(app.textFields["search_text_field"].waitForExistence(timeout: 5))
    }

    @MainActor
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
        app.waitForIntroToFinish()

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
