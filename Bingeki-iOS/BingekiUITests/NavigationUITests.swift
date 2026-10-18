import XCTest

final class NavigationUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testMainTabBarNavigationAndSearchModal() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-bk.mockAuth", "YES",
            "-bk.useInMemoryStore", "YES",
            "-bk.skipOnboarding", "YES",
            "-bk.onboardingDone", "YES",
            "-AppleLanguages", "(fr)",
            "-AppleLocale", "fr_FR"
        ]
        app.launch()
        app.waitForIntroToFinish()

        // 1. Verify Home Screen is visible
        let homeGreeting = app.staticTexts["home_title"]
        XCTAssertTrue(homeGreeting.waitForExistence(timeout: 5), "L'accueil doit être visible avec le titre 'On reprend ?'")

        // Verify Tab bar exists
        let homeTab = app.buttons["tab_home"]
        let discoverTab = app.buttons["tab_discover"]
        let libraryTab = app.buttons["tab_library"]
        let profileTab = app.buttons["tab_profile"]

        XCTAssertTrue(homeTab.exists, "L'onglet Accueil doit exister")
        XCTAssertTrue(discoverTab.exists, "L'onglet Découvrir doit exister")
        XCTAssertTrue(libraryTab.exists, "L'onglet Biblio doit exister")
        XCTAssertTrue(profileTab.exists, "L'onglet Profil doit exister dans la barre")

        // 2. Navigate to Découvrir
        discoverTab.tap()
        let forYouSegment = app.buttons["discover_segment_for_you"]
        let browseSegment = app.buttons["discover_segment_browse"]
        XCTAssertTrue(forYouSegment.waitForExistence(timeout: 3), "Le segment POUR TOI doit être présent")
        XCTAssertTrue(browseSegment.exists, "Le segment PARCOURIR doit être présent")

        // Switch to Parcourir
        browseSegment.tap()
        let collectionsHeader = app.staticTexts["Collections"]
        XCTAssertTrue(collectionsHeader.waitForExistence(timeout: 3), "La section Collections doit apparaître sur Parcourir")

        // 3. Navigate to Biblio
        libraryTab.tap()
        let biblioTitle = app.staticTexts["Biblio"]
        XCTAssertTrue(biblioTitle.waitForExistence(timeout: 3), "L'écran Biblio doit afficher le titre 'Biblio'")

        // 4. Open and dismiss the catalogue search from the library header.
        let searchButton = app.buttons["library_catalog_search"]
        XCTAssertTrue(searchButton.waitForExistence(timeout: 3), "Le bouton de recherche catalogue doit être présent dans Biblio")
        XCTAssertTrue(searchButton.isHittable, "Le bouton de recherche catalogue doit être accessible en haut à droite")
        searchButton.tap()
        let searchField = app.textFields["search_text_field"]
        XCTAssertTrue(searchField.waitForExistence(timeout: 3), "Le champ de recherche doit apparaître dans le modal")

        let cancelButton = app.buttons["search_cancel_button"]
        XCTAssertTrue(cancelButton.exists, "Le bouton Annuler doit être présent")
        cancelButton.tap()

        // Search modal dismissed, back on Library
        XCTAssertTrue(biblioTitle.waitForExistence(timeout: 3), "Le modal de recherche doit se fermer et revenir sur Biblio")
    }
}
