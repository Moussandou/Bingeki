import XCTest

final class AuthFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testAuthScreenPresentsBrandingAndButtons() {
        let app = XCUIApplication()
        // Force signed-out state so AuthView is reliably tested
        app.launchArguments = [
            "-bk.forceSignedOut", "YES",
            "-AppleLanguages", "(fr)",
            "-AppleLocale", "fr_FR"
        ]
        app.launch()
        app.waitForIntroToFinish()

        // Verify branding
        let brandingTitle = app.staticTexts["BINGEKI"]
        XCTAssertTrue(brandingTitle.waitForExistence(timeout: 5), "L'écran d'authentification doit afficher le titre BINGEKI")

        // Verify buttons
        let googleButton = app.buttons["auth_google_button"]
        XCTAssertTrue(googleButton.exists, "Le bouton Google doit être présent")

        #if DEBUG
        let devBypassButton = app.buttons["auth_dev_bypass_button"]
        XCTAssertTrue(devBypassButton.exists, "Le bouton de contournement dev doit être présent en configuration DEBUG")
        #endif
    }
}
