import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        excludeAppDataFromBackup()
        return true
    }

    /// The database and everything else the app stores live in the WebView's
    /// data folder (Library/WebKit). iOS would copy that to iCloud or a
    /// computer backup; baaki keeps everything on the phone (as the Android app
    /// does, with allowBackup off), and its own backup file is the way to move
    /// it. Excluding the folder excludes all of it, including what's added later.
    private func excludeAppDataFromBackup() {
        guard let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        var folder = library.appendingPathComponent("WebKit", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? folder.setResourceValues(values)
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
