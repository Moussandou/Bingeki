import Foundation
import Testing
@testable import Bingeki

struct AppDestinationTests {
    @Test func parsesExistingNativeAndWebShares() {
        for language in ["fr", "en"] {
            #expect(AppDestination.parse("https://bingeki.web.app/\(language)/work/52991?type=anime")
                    == .destination(.work(type: .anime, id: 52991)))
            #expect(AppDestination.parse("https://bingeki.web.app/\(language)/work/13?type=manga")
                    == .destination(.work(type: .manga, id: 13)))
            #expect(AppDestination.parse("https://bingeki.web.app/\(language)/profile/firebase-user_123")
                    == .destination(.profile(uid: "firebase-user_123")))
        }
    }

    @Test func keepsWorkTypeInTheIdentity() {
        let anime = AppDestination.parse("https://bingeki.web.app/fr/work/42?type=anime")
        let manga = AppDestination.parse("https://bingeki.web.app/fr/work/42?type=manga")
        #expect(anime == .destination(.work(type: .anime, id: 42)))
        #expect(manga == .destination(.work(type: .manga, id: 42)))
        #expect(anime != manga)
    }

    @Test func supportsURLInputsAndTheStandardHTTPSPort() throws {
        let url = try #require(URL(string: "https://bingeki.web.app:443/en/work/1?type=anime"))
        #expect(AppDestination.parse(url) == .destination(.work(type: .anime, id: 1)))
        #expect(AppDestination.parse("HTTPS://BINGEKI.WEB.APP/fr/work/1?type=anime")
                == .destination(.work(type: .anime, id: 1)))
    }

    @Test(arguments: [
        ("custom.uid-123_abc", "custom.uid-123_abc"),
        ("reader%40example.com", "reader@example.com"),
        ("%C3%A9l%C3%A8ve", "\u{e9}l\u{e8}ve"),
        ("reader%20one", "reader one"),
        ("literal%25reader", "literal%reader"),
        ("name%3Fpart%23tag", "name?part#tag"),
        (String(repeating: "a", count: 128), String(repeating: "a", count: 128)),
    ])
    func preservesFirebaseUIDs(encoded: String, uid: String) {
        #expect(AppDestination.parse("https://bingeki.web.app/fr/profile/\(encoded)")
                == .destination(.profile(uid: uid)))
    }

    @Test(arguments: [
        "",
        "/fr/work/1?type=anime",
        "//bingeki.web.app/fr/work/1?type=anime",
        "http://bingeki.web.app/fr/work/1?type=anime",
        "bingeki://bingeki.web.app/fr/work/1?type=anime",
        "javascript:alert(1)",
        "https://bingeki.web.app.evil.test/fr/work/1?type=anime",
        "https://evil-bingeki.web.app/fr/work/1?type=anime",
        "https://bingeki.web.app./fr/work/1?type=anime",
        "https://bingeki%2Eweb.app/fr/work/1?type=anime",
        "https://bingeki.web.app@evil.test/fr/work/1?type=anime",
        "https://evil.test@bingeki.web.app/fr/work/1?type=anime",
        "https://user:password@bingeki.web.app/fr/work/1?type=anime",
        "https://@bingeki.web.app/fr/work/1?type=anime",
        "https://bingeki.web.app:80/fr/work/1?type=anime",
        "https://bingeki.web.app:444/fr/work/1?type=anime",
        "https://bingeki.web.app:/fr/work/1?type=anime",
        " https://bingeki.web.app/fr/work/1?type=anime",
        "https://bingeki.web.app/fr/profile/raw space",
        "https://bingeki.web.app/fr/profile/raw\nnewline",
        "https://bingeki.web.app/fr/profile/%00",
        "https://bingeki.web.app/fr/profile/%0D%0A",
        "https://bingeki.web.app/fr/profile/%7F",
        "https://bingeki.web.app/fr/profile/%C2%85",
        "https://bingeki.web.app/fr/profile/%",
        "https://bingeki.web.app/fr/profile/%GG",
        "https://bingeki.web.app/fr/profile/%C0%AF",
        "https://bingeki.web.app/fr/profile/%FF",
        "https://bingeki.web.app/fr/work/1?type=anime&source=%00",
    ])
    func rejectsInvalidURLs(_ value: String) {
        #expect(AppDestination.parse(value) == .invalid)
    }

    @Test(arguments: [
        "/fr/work",
        "/fr/work/",
        "/fr/work/1/extra?type=anime",
        "/fr/work/1/?type=anime",
        "/fr/work/0?type=anime",
        "/fr/work/-1?type=anime",
        "/fr/work/+1?type=anime",
        "/fr/work/01?type=anime",
        "/fr/work/1.0?type=anime",
        "/fr/work/1e3?type=anime",
        "/fr/work/custom-id?type=anime",
        "/fr/work/9223372036854775808?type=anime",
        "/fr/work/1",
        "/fr/work/1?type",
        "/fr/work/1?type=",
        "/fr/work/1?type=Anime",
        "/fr/work/1?type=movie",
        "/fr/work/1?type=anime&type=manga",
        "/fr/work/1?type=anime&type=anime",
        "/fr/work/1?type=anime&%74ype=manga",
        "/fr/profile",
        "/fr/profile/",
        "/fr/profile/alice/extra",
        "/fr/profile/alice/",
        "/fr/profile/.",
        "/fr/profile/..",
        "/fr/profile/%2e%2e",
        "/fr/profile/alice%2Fbob",
        "/fr/profile/alice%2fbob",
        "/fr/profile/alice%5Cbob",
        "/fr/profile/alice\\bob",
        "/fr/profile/%252F",
        "/fr/profile/%25252F",
        "/fr/profile/%2500",
        "/fr/profile/" + String(repeating: "a", count: 129),
    ])
    func rejectsMalformedDestinations(_ path: String) {
        #expect(AppDestination.parse("https://bingeki.web.app\(path)") == .invalid)
    }

    @Test(arguments: [
        "/",
        "/work/1?type=anime",
        "/de/work/1?type=anime",
        "/FR/work/1?type=anime",
        "/%66r/work/1?type=anime",
        "/fr/%77ork/1?type=anime",
        "/fr/auth",
        "/fr/auth?redirect=/fr/work/1&type=anime",
        "/__/auth/handler",
        "/fr/admin",
        "/fr/social?tab=distinctions",
        "/fr/social?compose=1&work=manga%3A42&unit=5",
        "/fr/users/alice/library?folder=favorites",
        "/fr/work/1?type=anime&episode=5",
        "/fr/work/1?type=anime&utm_source=share",
        "/fr/work/1?type=anime&redirect=https%3A%2F%2Fevil.test",
        "/fr/work/1?type=anime&",
        "/fr/work/1?type=anime#reviews",
        "/fr/work/1?type=anime#",
        "/fr/profile/alice?type=anime",
        "/fr/profile/alice?utm_source=share",
        "/fr/profile/alice#library",
    ])
    func preservesUnsupportedWebSemantics(_ path: String) {
        #expect(AppDestination.parse("https://bingeki.web.app\(path)") == .unsupported)
    }
}
