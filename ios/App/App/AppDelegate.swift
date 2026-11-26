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

@objc(QuickActionPlugin)
class QuickActionPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "QuickActionPlugin"
    let jsName = "QuickAction"
    let pluginMethods: [CAPPluginMethod] = []
    private var pendingType: String?

    override func load() {
        if let type = pendingType {
            pendingType = nil
            perform(type)
        }
    }

    // A quick action can start the app before the bridge loads this plugin, and the web app adds
    // its listener only later; Capacitor keeps a retained event until that listener exists.
    func perform(_ type: String) {
        guard bridge != nil else {
            pendingType = type
            return
        }
        notifyListeners("quickAction", data: ["type": type], retainUntilConsumed: true)
    }
}

class MagicTapContainerViewController: UIViewController {
    let capacitorViewController: CAPBridgeViewController
    private let magicTapPlugin = VoiceOverMagicTapPlugin()
    let quickActionPlugin = QuickActionPlugin()

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
        // The Capacitor view is the WKWebView. @capacitor/keyboard (resize: native) shrinks it
        // via setFrame when the keyboard opens; Auto Layout constraints would reset that frame
        // and leave inputs hidden behind the keyboard, so use autoresizing masks instead.
        capacitorViewController.view.frame = view.bounds
        capacitorViewController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        capacitorViewController.didMove(toParent: self)
        capacitorViewController.bridge?.registerPluginInstance(magicTapPlugin)
        capacitorViewController.bridge?.registerPluginInstance(quickActionPlugin)
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
        // Override point for customization after application launch.
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

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
