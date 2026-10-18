import XCTest

/// Scripted walkthrough used to film the social trailer (demo account, no
/// personal data). Skipped unless `BK_TRAILER=1`, so it never runs in CI or
/// in the pre-push hook. Each action prints `BKT <name> <epoch>` so the edit
/// can place touch indicators and cuts on the exact frames.
final class TrailerFlowUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["BK_TRAILER"] == "1", "Trailer recording only")
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchArguments = ["-bk.mockAuth", "YES", "-bk.demoLibrary", "YES", "-bk.skipOnboarding", "YES",
                               "-bk.onboardingDone", "YES", "-bk.coach.feed", "YES", "-AppleLanguages", "(fr)", "-AppleLocale", "fr_FR"]
    }

    private func mark(_ name: String) { print("BKT \(name) \(Date().timeIntervalSince1970)") }
    private func wait(_ s: TimeInterval) { Thread.sleep(forTimeInterval: s) }
    private func point(_ x: CGFloat, _ y: CGFloat) -> XCUICoordinate {
        app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y))
    }
    private func tap(_ name: String, _ x: CGFloat, _ y: CGFloat) { mark("tap:\(name):\(Int(x)):\(Int(y))"); point(x, y).tap() }
    private func swipe(_ name: String, from a: CGPoint, to b: CGPoint, velocity: XCUIGestureVelocity = .fast) {
        mark("swipe:\(name):\(Int(a.x)):\(Int(a.y)):\(Int(b.x)):\(Int(b.y))")
        point(a.x, a.y).press(forDuration: 0.02, thenDragTo: point(b.x, b.y), withVelocity: velocity, thenHoldForDuration: 0)
    }

    func testTrailerFlow() {
        app.launch()
        app.waitForIntroToFinish()
        mark("launched")
        XCTAssertTrue(app.staticTexts["home_title"].waitForExistence(timeout: 15))
        wait(2.0)

        // 1. Home: +1 episode -> level up overlay
        mark("scene:home")
        tap("plus1", 221, 337)
        wait(3.6)   // the level-up overlay closes by itself
        // streak sheet
        tap("streak", 306, 112)
        wait(2.4)
        swipe("closeSheet", from: CGPoint(x: 201, y: 460), to: CGPoint(x: 201, y: 860))
        wait(1.2)

        // 2. Discover feed with trailers
        mark("scene:discover")
        tap("tabDiscover", 164, 806)
        wait(4.0)
        // scroll until a card whose trailer actually plays
        for i in 0..<8 {
            if app.webViews.firstMatch.exists { break }
            swipe("feedSeek\(i)", from: CGPoint(x: 160, y: 620), to: CGPoint(x: 160, y: 220))
            wait(2.6)
        }
        mark("trailerVisible")
        wait(4.5)
        mark("doubletap")
        point(170, 420).doubleTap()
        wait(2.0)
        swipe("feedNext2", from: CGPoint(x: 160, y: 620), to: CGPoint(x: 160, y: 220))
        wait(4.0)

        // 3. Library: status filter, sort, multi-select
        mark("scene:library")
        tap("tabLibrary", 266, 806)
        wait(1.8)
        tap("pillAVoir", 190, 202)
        wait(1.4)
        tap("pillEnCours", 70, 202)
        wait(1.0)
        if app.buttons["library_sort_menu"].exists {
            mark("tap:sortMenu:" + coord(app.buttons["library_sort_menu"]))
            app.buttons["library_sort_menu"].tap()
            wait(1.0)
            if app.buttons["Progression"].exists { mark("tap:sortProgress:" + coord(app.buttons["Progression"])); app.buttons["Progression"].tap() }
            wait(1.6)
        }
        if app.buttons["library_select_button"].exists {
            mark("tap:select:" + coord(app.buttons["library_select_button"]))
            app.buttons["library_select_button"].tap()
            wait(0.8)
            tap("row1", 200, 300)
            wait(0.5)
            tap("row2", 200, 388)
            wait(1.4)
            if app.buttons["library_select_done"].exists { mark("tap:done:" + coord(app.buttons["library_select_done"])); app.buttons["library_select_done"].tap() }
            wait(1.0)
        }

        // 4. Search
        mark("scene:search")
        let search = app.buttons.matching(identifier: "search_button").allElementsBoundByIndex.first { $0.isHittable }
        if let search { mark("tap:search:" + coord(search)); search.tap() }
        let field = app.textFields["search_text_field"]
        if field.waitForExistence(timeout: 3) {
            for ch in "Frieren" { mark("key"); field.typeText(String(ch)); wait(0.28) }
            wait(2.8)
            let hit = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Frieren'")).allElementsBoundByIndex.first { $0.isHittable && $0.frame.minY > 140 }
            if let hit { mark("tap:result:" + coord(hit)); hit.tap() }
            wait(3.0)
            swipe("detailScroll", from: CGPoint(x: 200, y: 700), to: CGPoint(x: 200, y: 300), velocity: .slow)
            wait(2.0)
        }

        // 5. Profile
        mark("scene:profile")
        if app.buttons["search_cancel_button"].exists { app.buttons["search_cancel_button"].tap(); wait(0.8) }
        else { swipe("closeSearch", from: CGPoint(x: 201, y: 120), to: CGPoint(x: 201, y: 860)); wait(1.0) }
        tap("tabProfile", 358, 800)
        wait(2.4)
        swipe("profileScroll", from: CGPoint(x: 200, y: 700), to: CGPoint(x: 200, y: 260), velocity: .slow)
        wait(2.4)
        mark("end")
    }

    private func coord(_ el: XCUIElement) -> String {
        let f = el.frame
        return "\(Int(f.midX)):\(Int(f.midY))"
    }
}
