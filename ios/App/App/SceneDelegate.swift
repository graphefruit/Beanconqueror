import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let container = MagicTapContainerViewController(capacitorViewController: CAPBridgeViewController())
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = container
        window?.makeKeyAndVisible()

        // Links and universal links of a cold start reach the app once Capacitor's view appears.
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        if let shortcutItem = connectionOptions.shortcutItem {
            container.quickActionPlugin.perform(shortcutItem.type)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        guard let container = window?.rootViewController as? MagicTapContainerViewController else {
            completionHandler(false)
            return
        }
        container.quickActionPlugin.perform(shortcutItem.type)
        completionHandler(true)
    }
}
