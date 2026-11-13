import UIKit
import Capacitor

/// Keeps baaki's contents out of the app switcher while the app lock is on, so
/// balances aren't readable there: as the app leaves the foreground it is
/// covered with the launch screen's logo on parchment, and uncovered on return.
/// (iOS takes the app switcher's picture after the app has resigned active.)
@objc(PrivacyScreenPlugin)
public class PrivacyScreenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrivacyScreenPlugin"
    public let jsName = "PrivacyScreen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise)
    ]

    private var enabled = false
    private var cover: UIView?

    override public func load() {
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(willResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(didBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc func setEnabled(_ call: CAPPluginCall) {
        let on = call.getBool("enabled", false)
        DispatchQueue.main.async {
            self.enabled = on
            if !on { self.uncover() }
            call.resolve()
        }
    }

    @objc private func willResignActive() {
        guard enabled, cover == nil, let window = bridge?.viewController?.view.window else { return }
        let view = UIView(frame: window.bounds)
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.backgroundColor = LaunchCover.splashBackground
        let logo = UIImageView(image: UIImage(named: "LaunchLogo"))
        logo.contentMode = .scaleAspectFit
        logo.frame = CGRect(x: 0, y: 0, width: LaunchCover.logoCanvas, height: LaunchCover.logoCanvas)
        logo.center = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
        logo.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin, .flexibleTopMargin, .flexibleBottomMargin]
        view.addSubview(logo)
        window.addSubview(view)
        cover = view
    }

    @objc private func didBecomeActive() {
        uncover()
    }

    private func uncover() {
        cover?.removeFromSuperview()
        cover = nil
    }
}
