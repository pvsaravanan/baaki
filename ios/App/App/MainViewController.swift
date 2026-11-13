import UIKit
import Capacitor

/// The app's one screen: Capacitor's WebView, serving the static build from
/// the phone, with baaki's own plugins registered and the launch animation
/// (LaunchCover) over it while it loads.
class MainViewController: CAPBridgeViewController {

    /// The app's page colour (PARCHMENT in scripts/make-app-icons.mjs).
    static let parchment = UIColor(red: 0xf4 / 255, green: 0xf1 / 255, blue: 0xea / 255, alpha: 1)

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrivacyScreenPlugin())
        bridge?.registerPluginInstance(LaunchVideoPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Parchment, not white, wherever the page hasn't drawn yet (start-up,
        // and past the page's edges when it's pulled beyond them).
        view.backgroundColor = Self.parchment
        webView?.isOpaque = false
        webView?.backgroundColor = Self.parchment
        webView?.scrollView.backgroundColor = Self.parchment
        LaunchCover.show(over: view)
    }
}
