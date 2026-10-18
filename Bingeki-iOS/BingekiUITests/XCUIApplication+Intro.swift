import XCTest

extension XCUIApplication {
    /// The launch intro covers the app for ~2.5 s; wait until it's gone before tapping.
    func waitForIntroToFinish(timeout: TimeInterval = 10) {
        let splash = descendants(matching: .any)["bk_splash"]
        let deadline = Date().addingTimeInterval(timeout)
        while splash.exists, Date() < deadline { Thread.sleep(forTimeInterval: 0.2) }
    }
}
