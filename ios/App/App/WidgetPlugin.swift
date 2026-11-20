import Capacitor
import WidgetKit

/// Hands the home screen widget the snapshot the web app computed.
@objc(WidgetPlugin)
class WidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "WidgetPlugin"
    let jsName = "Widget"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise)
    ]

    /// Same app group and key as BrewWidget.swift in the extension.
    private let appGroup = "group.com.beanconqueror.app"

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot") else {
            call.reject("No snapshot")
            return
        }
        // Without the app group entitlement UserDefaults(suiteName:) still
        // returns an object, but one the extension never reads; only the
        // container lookup tells.
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) != nil,
              let defaults = UserDefaults(suiteName: appGroup) else {
            call.reject("No app group")
            return
        }
        defaults.set(snapshot, forKey: "snapshot")
        call.resolve()
    }

    @objc func reload(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadTimelines(ofKind: "BrewWidget")
        call.resolve()
    }
}
