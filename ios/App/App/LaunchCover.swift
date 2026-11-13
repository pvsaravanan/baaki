import UIKit
import AVFoundation
import Capacitor

/// The launch animation, over the app while it loads: the iOS counterpart of
/// android/.../LaunchVideo.java, with the same video, timings and exit.
///
/// The launch screen (LaunchScreen.storyboard) shows the logo at rest, and
/// this cover picks it up in the same place. On a fresh install the video
/// plays (splash.mp4: the logo drawing itself in, then the wordmark): it opens
/// on plain parchment, so the resting logo fades out as it starts. Every
/// launch after the first holds the resting logo instead. Either way the cover
/// leaves once the video has played (or the logo has been seen) and the app
/// has said it's ready (LaunchVideoPlugin.finish), until then holding the last
/// frame. If the screen beneath has a logo of its own, the logo glides onto it.
///
/// Start-up keeps the main thread busy (the WebView, the app's scripts, the
/// database), so nothing here animates on it: the video is drawn by an
/// AVPlayerLayer and every movement is a Core Animation animation, both run by
/// the render server once committed.
final class LaunchCover: UIView {
    /// Behind the launch logo and in the video (SPLASH_BACKGROUND in
    /// scripts/make-app-icons.mjs and src/components/app/splash-handoff.tsx).
    static let splashBackground = UIColor(red: 0xf8 / 255, green: 0xf2 / 255, blue: 0xe9 / 255, alpha: 1)
    /// LaunchLogo's square canvas, in points, as the launch screen draws it
    /// (the size Android draws its splash icon at).
    static let logoCanvas: CGFloat = 288

    // Not playing by then (no decoder, broken file): skip the animation.
    private static let startTimeout: TimeInterval = 3
    // The app never said it's ready (it crashed or hangs): leave anyway, so the
    // app's own loading or recovery screen shows instead of a frozen splash.
    private static let giveUp: TimeInterval = 20
    private static let fade: TimeInterval = 0.42
    private static let exitScale: CGFloat = 1.04
    // The video's motion is over by about 3.5 s; the rest of the file is the
    // finished logo held still.
    private static let videoPlay: TimeInterval = 4.4
    // Fresh install: the resting logo gives way to the video's blank opening.
    private static let logoOut: TimeInterval = 0.22
    // Leaving onto a screen with a logo of its own.
    private static let glideOut: TimeInterval = 0.56
    private static let glideHandover: TimeInterval = 0.06
    // Later launches: however fast the app is ready, the logo stays up at
    // least this long so it can be seen, not just flashed.
    private static let minStill: TimeInterval = 1.8

    // The video's size in pixels; its logo is centred on the screen.
    private static let videoSize = CGSize(width: 1080, height: 2400)
    // The finished logo in the video's last frame, as its dark "B", in video
    // pixels: centre and width.
    private static let endB = (x: CGFloat(219.5), y: CGFloat(1210.5), w: CGFloat(227))
    // The same dark "B" in LaunchLogo, as fractions of its square canvas
    // (centre and width), and the artwork's whole width, sparks included.
    private static let artB = (cx: CGFloat(561.5 / 1152), cy: CGFloat(596.5 / 1152), w: CGFloat(363.0 / 1152))
    private static let artW: CGFloat = 391.0 / 1152

    private static let playedKey = "launch.animationPlayed"

    private(set) static var current: LaunchCover?

    private let backdrop = UIView()
    private let videoView = PlayerView()
    private let still = UIImageView(image: UIImage(named: "SplashLastFrame"))
    // The same last frame without its logo, for leaving onto a screen that has
    // one (the logo glides there on its own).
    private let stillBare = UIImageView(image: UIImage(named: "SplashLastFrameWordmark"))
    private let veil = UIView()
    private let logo = UIImageView(image: UIImage(named: "LaunchLogo"))

    private var player: AVPlayer?
    private var readyObservation: NSKeyValueObservation?
    private var statusObservation: NSKeyValueObservation?
    private var timers: [DispatchWorkItem] = []

    private var videoShown = false
    private var videoDone = false
    private var started = false
    private var ended = false
    private var ready = false
    private var leaving = false
    private var logoTarget: CGRect?
    private var onGone: [() -> Void] = []

    /// Start the animation, over `view` (the bridge's, before the WebView draws).
    static func show(over view: UIView) {
        let cover = LaunchCover(frame: view.bounds)
        view.addSubview(cover)
        current = cover
        cover.start()
    }

    /// The app beneath is ready; `gone` runs once the animation has left.
    /// `target` is where the screen beneath has a logo of its own, in this
    /// cover's coordinates.
    static func appReady(target: CGRect?, gone: @escaping () -> Void) {
        if let current { current.ready(target: target, gone: gone) } else { gone() }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        autoresizingMask = [.flexibleWidth, .flexibleHeight]
        // Swallows taps meant for the app beneath while it's covered.
        isUserInteractionEnabled = true

        for parchment in [backdrop, veil] {
            parchment.backgroundColor = Self.splashBackground
        }
        for image in [still, stillBare] {
            image.contentMode = .scaleAspectFill
            image.isHidden = true
        }
        videoView.playerLayer.videoGravity = .resizeAspectFill
        logo.contentMode = .scaleAspectFit
        for layer in [backdrop, videoView, still, stillBare, veil] {
            layer.frame = bounds
            layer.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            addSubview(layer)
        }
        addSubview(logo)
    }

    required init?(coder: NSCoder) { fatalError("not used from a storyboard") }

    override func layoutSubviews() {
        super.layoutSubviews()
        // As the launch screen places it: centred, at its canvas size.
        if !leaving {
            logo.bounds = CGRect(x: 0, y: 0, width: Self.logoCanvas, height: Self.logoCanvas)
            logo.center = CGPoint(x: bounds.midX, y: bounds.midY)
        }
    }

    private func after(_ delay: TimeInterval, _ work: @escaping () -> Void) {
        let item = DispatchWorkItem(block: work)
        timers.append(item)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
    }

    private func start() {
        after(Self.giveUp) { [weak self] in self?.leave() }

        let defaults = UserDefaults.standard
        let fresh = !defaults.bool(forKey: Self.playedKey)
        if fresh { defaults.set(true, forKey: Self.playedKey) }
        let reduceMotion = UIAccessibility.isReduceMotionEnabled

        guard fresh, !reduceMotion, let url = Bundle.main.url(forResource: "splash", withExtension: "mp4") else {
            // Every launch after the first, or with Reduce Motion on: no video,
            // just the logo at rest until the app is ready.
            videoView.isHidden = true
            if reduceMotion { ended = true } else { after(Self.minStill) { [weak self] in self?.finished() } }
            return
        }

        after(Self.startTimeout) { [weak self] in
            if self?.started == false { self?.finished() }
        }
        // Silent, and never interrupting what the person is listening to.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: .mixWithOthers)
        let item = AVPlayerItem(url: url)
        let player = AVPlayer(playerItem: item)
        player.isMuted = true
        player.actionAtItemEnd = .pause
        self.player = player
        videoView.playerLayer.player = player
        statusObservation = item.observe(\.status) { [weak self] item, _ in
            guard item.status == .failed else { return }
            DispatchQueue.main.async { self?.finished() }
        }
        // The layer has a picture to show: lift the veil and play from the top.
        readyObservation = videoView.playerLayer.observe(\.isReadyForDisplay, options: [.initial, .new]) { [weak self] layer, _ in
            guard layer.isReadyForDisplay else { return }
            DispatchQueue.main.async { self?.startVideo() }
        }
    }

    private func startVideo() {
        guard !started, !leaving, let player else { return }
        started = true
        readyObservation = nil
        veil.isHidden = true
        videoShown = true
        player.play()
        UIViewPropertyAnimator(duration: Self.logoOut, curve: .easeOut) { self.logo.alpha = 0 }.startAnimation()
        after(Self.videoPlay) { [weak self] in self?.videoEnded() }
    }

    /// The video has played: swap it for a still of its last frame, drawn the
    /// same size and place, so the exit animates only ordinary views.
    private func videoEnded() {
        guard !leaving, !videoDone else { return }
        videoDone = true
        still.isHidden = false
        // The video goes a frame after the still is up, so there's never a gap.
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.player?.pause()
            self.videoView.isHidden = true
            self.finished()
        }
    }

    private func finished() {
        // The video never played (no decoder, a broken file): show the logo while the app loads.
        if !videoShown { logo.alpha = 1 }
        ended = true
        maybeLeave()
    }

    private func ready(target: CGRect?, gone: @escaping () -> Void) {
        ready = true
        logoTarget = target
        onGone.append(gone)
        maybeLeave()
    }

    private func maybeLeave() {
        if ended && ready { leave() }
    }

    /// Dissolve into the app beneath: fade out while growing a touch, as if the
    /// splash were lifting off.
    private func leave() {
        guard !leaving else { return }
        leaving = true
        timers.forEach { $0.cancel() }
        timers.removeAll()
        // Left early (gave up, or no animation): nothing to fade with the video.
        videoView.isHidden = true
        player?.pause()
        // Taps go through to the app as it comes into view.
        isUserInteractionEnabled = false
        if let target = logoTarget, leaveOnto(target) { return }
        let exit = UIViewPropertyAnimator(duration: Self.fade, controlPoint1: CGPoint(x: 0.4, y: 0), controlPoint2: CGPoint(x: 0.2, y: 1)) {
            self.alpha = 0
            self.transform = CGAffineTransform(scaleX: Self.exitScale, y: Self.exitScale)
        }
        exit.addCompletion { [weak self] _ in self?.remove() }
        exit.startAnimation()
    }

    /// Leave onto a screen that has a logo of its own: carry the logo there
    /// while everything else (the parchment, the wordmark) dissolves, so the one
    /// logo moves into place instead of two fading past each other. The screen
    /// hides its copy until this is done, then shows it as this one lands.
    /// Returns false (nothing done) if it can't: the video is still on screen.
    private func leaveOnto(_ target: CGRect) -> Bool {
        let w = bounds.width, h = bounds.height
        if w == 0 || h == 0 || (videoShown && !videoDone) { return false }
        let size = Self.logoCanvas
        let centre = logo.center
        if videoShown {
            // Over the logo in the video's last frame (its dark "B" on the video's).
            let scale = videoScale()
            let bx = w / 2 + (Self.endB.x - Self.videoSize.width / 2) * scale
            let by = h / 2 + (Self.endB.y - Self.videoSize.height / 2) * scale
            let s = Self.endB.w * scale / (Self.artB.w * size)
            logo.transform = CGAffineTransform(
                translationX: bx - centre.x - s * size * (Self.artB.cx - 0.5),
                y: by - centre.y - s * size * (Self.artB.cy - 0.5)
            ).scaledBy(x: s, y: s)
            logo.alpha = 1
            // The last frame's own logo goes (the wordmark stays): this one takes its place.
            if stillBare.image != nil {
                stillBare.isHidden = false
                still.isHidden = true
            }
        }
        let targetScale = target.width / (Self.artW * size)
        let tx = target.midX - centre.x
        let ty = target.midY - centre.y

        let standard = (CGPoint(x: 0.4, y: 0), CGPoint(x: 0.2, y: 1))
        UIViewPropertyAnimator(duration: Self.glideOut, controlPoint1: standard.0, controlPoint2: standard.1) {
            self.backdrop.alpha = 0
            self.veil.alpha = 0
        }.startAnimation()
        UIViewPropertyAnimator(duration: Self.glideOut / 2, controlPoint1: standard.0, controlPoint2: standard.1) {
            self.still.alpha = 0
            self.stillBare.alpha = 0
        }.startAnimation()
        UIViewPropertyAnimator(duration: Self.glideOut, controlPoint1: CGPoint(x: 0.22, y: 1), controlPoint2: CGPoint(x: 0.36, y: 1)) {
            self.logo.transform = CGAffineTransform(translationX: tx, y: ty).scaledBy(x: targetScale, y: targetScale)
        }.startAnimation()
        // Near the end the screen shows its own logo beneath (the app is told now)
        // and this one fades into it, which also hides any difference between them.
        let near = Self.glideOut * 0.55
        DispatchQueue.main.asyncAfter(deadline: .now() + near) { [weak self] in
            guard let self else { return }
            self.runGone()
            UIViewPropertyAnimator(duration: Self.glideOut - near, controlPoint1: standard.0, controlPoint2: standard.1) {
                self.logo.alpha = 0
            }.startAnimation()
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.glideOut - near + Self.glideHandover) { [weak self] in
                self?.remove()
            }
        }
        return true
    }

    /// How much the video is scaled to fill the screen (cropped at the sides).
    private func videoScale() -> CGFloat {
        max(bounds.width / Self.videoSize.width, bounds.height / Self.videoSize.height)
    }

    private func runGone() {
        let gone = onGone
        onGone.removeAll()
        gone.forEach { $0() }
    }

    private func remove() {
        removeFromSuperview()
        readyObservation = nil
        statusObservation = nil
        videoView.playerLayer.player = nil
        player = nil
        if Self.current === self { Self.current = nil }
        runGone()
    }
}

/// A view drawn by an AVPlayerLayer.
private final class PlayerView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}

/// The app tells the launch animation (LaunchCover) it has loaded. Resolves
/// once the animation has left the screen. If the screen beneath has a logo of
/// its own, it passes that logo's place (x, y, width, height, in CSS pixels,
/// which are points in the WebView) and the launch logo glides onto it.
@objc(LaunchVideoPlugin)
public class LaunchVideoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LaunchVideoPlugin"
    public let jsName = "LaunchVideo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]

    @objc func finish(_ call: CAPPluginCall) {
        let x = call.getDouble("x"), y = call.getDouble("y")
        let width = call.getDouble("width"), height = call.getDouble("height")
        DispatchQueue.main.async {
            var target: CGRect?
            if let x, let y, let width, let height, let webView = self.webView, let cover = LaunchCover.current {
                target = webView.convert(CGRect(x: x, y: y, width: width, height: height), to: cover)
            }
            LaunchCover.appReady(target: target) { call.resolve() }
        }
    }
}
