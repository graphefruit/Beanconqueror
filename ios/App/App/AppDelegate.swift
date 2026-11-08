import UIKit
import Capacitor

@objc(VoiceOverMagicTapPlugin)
class VoiceOverMagicTapPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "VoiceOverMagicTapPlugin"
    let jsName = "VoiceOverMagicTap"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise)
    ]
    private(set) var enabled = false

    @objc func setEnabled(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.enabled = call.getBool("enabled") ?? false
            call.resolve()
        }
    }
}

class MagicTapContainerViewController: UIViewController {
    let capacitorViewController: CAPBridgeViewController
    private let magicTapPlugin = VoiceOverMagicTapPlugin()

    init(capacitorViewController: CAPBridgeViewController) {
        self.capacitorViewController = capacitorViewController
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        addChild(capacitorViewController)
        view.addSubview(capacitorViewController.view)
        capacitorViewController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            capacitorViewController.view.topAnchor.constraint(equalTo: view.topAnchor),
            capacitorViewController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            capacitorViewController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            capacitorViewController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        capacitorViewController.didMove(toParent: self)
        capacitorViewController.bridge?.registerPluginInstance(magicTapPlugin)
    }

    override var childForStatusBarStyle: UIViewController? {
        return capacitorViewController
    }

    override var childForStatusBarHidden: UIViewController? {
        return capacitorViewController
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return capacitorViewController.supportedInterfaceOrientations
    }

    override func accessibilityPerformMagicTap() -> Bool {
        guard UIAccessibility.isVoiceOverRunning, magicTapPlugin.enabled,
              let bridge = capacitorViewController.bridge,
              presentedViewController == nil,
              capacitorViewController.presentedViewController == nil else {
            return super.accessibilityPerformMagicTap()
        }
        bridge.triggerWindowJSEvent(eventName: "voiceOverMagicTap")
        return true
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let capacitorViewController = window?.rootViewController as? CAPBridgeViewController {
            window?.rootViewController = MagicTapContainerViewController(
                capacitorViewController: capacitorViewController
            )
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, performActionFor shortcutItem:
          UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
          let rootViewController = window?.rootViewController
          let capacitorViewController =
              (rootViewController as? MagicTapContainerViewController)?.capacitorViewController
              ?? (rootViewController as? CAPBridgeViewController)
          guard let bridge = capacitorViewController?.bridge else {
              completionHandler(false)
              return
          }
          bridge.webView?.evaluateJavaScript("handleQuickAction('"+shortcutItem.type+"')")
          completionHandler(true)
      }

}
