import AVFoundation
import SwiftUI
import WebKit

/// YouTube trailer for the feed, through the official IFrame player (the
/// only way YouTube allows embedding). Plays inline, looped, with sound,
/// without YouTube's controls; touches pass through to the page so double
/// tap and scrolling keep working.
///
/// Can be created paused (`isPlaying == false`) to preload the next page's
/// trailer, then started instantly when that page comes on screen. The
/// player is drawn slightly larger than its frame so YouTube's title bar
/// and logo, pinned to the edges, fall outside it.
struct TrailerPlayer: UIViewRepresentable {
    let youtubeId: String
    let isPlaying: Bool
    let muted: Bool
    let onPlaying: () -> Void
    let onStopped: () -> Void
    let onFailure: () -> Void

    /// Edge crop, a safety margin in case a YouTube overlay escapes the CSS.
    private static let overscan = 0.05

    private static let hideChromeScript = """
    (function(){
      if (!/youtube/.test(location.hostname)) return;
      var css = '.html5-video-player > :not(.html5-video-container){display:none!important}'
        + '.ytp-chrome-top,.ytp-chrome-bottom,.ytp-gradient-top,.ytp-gradient-bottom,.ytp-pause-overlay,'
        + '.ytp-watermark,.ytp-large-play-button,.ytp-cued-thumbnail-overlay,.ytp-ce-element,'
        + '.ytp-paid-content-overlay,.ytp-spinner,.ytp-unmute,.ytmCuedOverlayHost,.player-controls-content,'
        + '.ytp-overlays-container,.ytp-impression-link,.ytp-endscreen-content{display:none!important}'
        + 'video{object-fit:cover!important}';
      var style = document.createElement('style');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    })();
    """

    func makeCoordinator() -> Coordinator {
        Coordinator(onPlaying: onPlaying, onStopped: onStopped, onFailure: onFailure)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(WeakHandler(context.coordinator), name: "bk")
        // YouTube's player draws its own chrome (pause/skip overlay, title,
        // logo, "Plus de vidéos") even with controls=0. Injected into every
        // frame, so it reaches inside the YouTube iframe and hides it all,
        // leaving only the video.
        config.userContentController.addUserScript(WKUserScript(
            source: Self.hideChromeScript,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: false
        ))

        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = .black
        view.scrollView.isScrollEnabled = false
        view.isUserInteractionEnabled = false
        // A real origin: YouTube refuses embeds without a referrer.
        view.loadHTMLString(Self.html(youtubeId, play: isPlaying, muted: muted),
                            baseURL: URL(string: "https://bingeki.web.app"))
        context.coordinator.lastPlaying = isPlaying
        context.coordinator.lastMuted = muted
        if isPlaying { Self.activateAudio() }
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        let coordinator = context.coordinator
        // The closures capture the page as it was when they were made; a
        // preloaded page's old ones would ignore "playing" once it's on
        // screen, leaving the sound on behind a hidden video.
        coordinator.onPlaying = onPlaying
        coordinator.onStopped = onStopped
        coordinator.onFailure = onFailure
        if coordinator.lastMuted != muted {
            coordinator.lastMuted = muted
            view.evaluateJavaScript("setMuted(\(muted))")
        }
        if coordinator.lastPlaying != isPlaying {
            coordinator.lastPlaying = isPlaying
            if isPlaying { Self.activateAudio() }
            view.evaluateJavaScript("setPlay(\(isPlaying))")
        }
    }

    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.evaluateJavaScript("setPlay(false)")
        view.configuration.userContentController.removeScriptMessageHandler(forName: "bk")
        view.loadHTMLString("", baseURL: nil)
    }

    /// Sound like a video app, even with the silent switch on.
    private static func activateAudio() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    private static func html(_ id: String, play: Bool, muted: Bool) -> String {
        let pad = Int(overscan * 100)
        let size = 100 + 2 * pad
        return """
        <!doctype html><html><head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
        <style>
        html,body{margin:0;height:100%;background:#000;overflow:hidden}
        #p{position:absolute;left:-\(pad)%;top:-\(pad)%;width:\(size)%;height:\(size)%;pointer-events:none}
        </style>
        </head><body><div id="p"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
        var player, ready = false, want = \(play), muted = \(muted);
        function post(m){ window.webkit.messageHandlers.bk.postMessage(m); }
        function setMuted(m){ muted = m; if (ready) { m ? player.mute() : player.unMute(); } }
        function setPlay(p){
          want = p;
          if (!ready) return;
          if (p) {
            muted ? player.mute() : player.unMute();
            player.playVideo();
            // Already rolling (preload buffer): no state change will fire.
            if (player.getPlayerState() === 1) post('playing');
          } else {
            player.pauseVideo();
          }
        }
        function onYouTubeIframeAPIReady(){
          player = new YT.Player('p', {
            videoId: '\(id)',
            host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: \(play ? 1 : 0), mute: \(muted ? 1 : 0), controls: 0, playsinline: 1,
                          loop: 1, playlist: '\(id)', rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0,
                          modestbranding: 1, showinfo: 0, cc_load_policy: 0, origin: 'https://bingeki.web.app' },
            events: {
              onReady: function(e){
                ready = true;
                muted ? e.target.mute() : e.target.unMute();
                if (want) { e.target.playVideo(); }
                else { e.target.mute(); e.target.setPlaybackQuality && e.target.setPlaybackQuality('medium'); e.target.playVideo(); setTimeout(function(){
                  // Buffer the start for an instant play later, then hold.
                  if (!want) { e.target.pauseVideo(); e.target.seekTo(0, true); }
                  else if (e.target.getPlayerState() === 1) { post('playing'); }
                  muted ? e.target.mute() : e.target.unMute();
                }, 900); }
              },
              onStateChange: function(e){
                if (e.data === 1 && want) post('playing');
                if (e.data === 2 || e.data === 0) post('stopped');
              },
              onError: function(){ post('error'); }
            }
          });
        }
        </script></body></html>
        """
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler {
        var onPlaying: () -> Void
        var onStopped: () -> Void
        var onFailure: () -> Void
        var lastPlaying = false
        var lastMuted = false

        init(onPlaying: @escaping () -> Void, onStopped: @escaping () -> Void, onFailure: @escaping () -> Void) {
            self.onPlaying = onPlaying
            self.onStopped = onStopped
            self.onFailure = onFailure
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.body as? String {
            case "playing": onPlaying()
            case "stopped": onStopped()
            case "error": onFailure()
            default: break
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
