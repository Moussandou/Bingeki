import AVFoundation
import SwiftUI
import WebKit

/// YouTube trailer for the feed, through the official IFrame player (the
/// only way YouTube allows embedding). Plays inline, looped, with sound,
/// without YouTube's controls; touches pass through to the page so double
/// tap and scrolling keep working. Reports `onPlaying` once frames actually
/// show, so the poster can stay up until then, and `onFailure` if YouTube
/// refuses the video.
struct TrailerPlayer: UIViewRepresentable {
    let youtubeId: String
    let muted: Bool
    let onPlaying: () -> Void
    let onFailure: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPlaying: onPlaying, onFailure: onFailure) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(WeakHandler(context.coordinator), name: "bk")

        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = .black
        view.scrollView.isScrollEnabled = false
        view.isUserInteractionEnabled = false
        // Sound like a video app, even with the silent switch on.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
        // A real origin: YouTube refuses embeds without a referrer.
        view.loadHTMLString(Self.html(youtubeId, muted: muted), baseURL: URL(string: "https://bingeki.web.app"))
        context.coordinator.lastMuted = muted
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        guard context.coordinator.lastMuted != muted else { return }
        context.coordinator.lastMuted = muted
        view.evaluateJavaScript(muted ? "player && player.mute()" : "player && player.unMute()")
    }

    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.evaluateJavaScript("player && player.stopVideo()")
        view.configuration.userContentController.removeScriptMessageHandler(forName: "bk")
        view.loadHTMLString("", baseURL: nil)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private static func html(_ id: String, muted: Bool) -> String {
        """
        <!doctype html><html><head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
        <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;inset:0;width:100%;height:100%}</style>
        </head><body><div id="p"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
        var player;
        function post(m){ window.webkit.messageHandlers.bk.postMessage(m); }
        function onYouTubeIframeAPIReady(){
          player = new YT.Player('p', {
            videoId: '\(id)',
            host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, mute: \(muted ? 1 : 0), controls: 0, playsinline: 1, loop: 1,
                          playlist: '\(id)', rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0,
                          modestbranding: 1, origin: 'https://bingeki.web.app' },
            events: {
              onReady: function(e){ \(muted ? "e.target.mute();" : "e.target.unMute();") e.target.playVideo(); },
              onStateChange: function(e){ if (e.data === 1) post('playing'); },
              onError: function(){ post('error'); }
            }
          });
        }
        </script></body></html>
        """
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler {
        let onPlaying: () -> Void
        let onFailure: () -> Void
        var lastMuted = false
        private var reportedPlaying = false

        init(onPlaying: @escaping () -> Void, onFailure: @escaping () -> Void) {
            self.onPlaying = onPlaying
            self.onFailure = onFailure
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.body as? String {
            case "playing" where !reportedPlaying:
                reportedPlaying = true
                onPlaying()
            case "error":
                onFailure()
            default:
                break
            }
        }
    }

    /// WKUserContentController retains its handlers; this breaks the cycle.
    private final class WeakHandler: NSObject, WKScriptMessageHandler {
        weak var target: (any WKScriptMessageHandler)?
        init(_ target: any WKScriptMessageHandler) { self.target = target }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            target?.userContentController(controller, didReceive: message)
        }
    }
}
