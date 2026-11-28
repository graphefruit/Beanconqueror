import Capacitor
import HealthKit

/// Writes the caffeine of a brew to Apple Health; asks for nothing else and reads nothing.
@objc(CaffeineHealthPlugin)
class CaffeineHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CaffeineHealthPlugin"
    let jsName = "CaffeineHealth"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "storeCaffeine", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()
    private let caffeine = HKQuantityType(.dietaryCaffeine)

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health unavailable")
            return
        }
        store.requestAuthorization(toShare: [caffeine], read: []) { [weak self] success, error in
            guard let self, success else {
                call.reject(error?.localizedDescription ?? "Authorization failed")
                return
            }
            // Success only means the sheet was handled; for write access the status tells the answer.
            let granted = self.store.authorizationStatus(for: self.caffeine) == .sharingAuthorized
            call.resolve(["granted": granted])
        }
    }

    @objc func storeCaffeine(_ call: CAPPluginCall) {
        guard let grams = call.getDouble("grams"), let millis = call.getDouble("date") else {
            call.reject("Missing grams or date")
            return
        }
        let date = Date(timeIntervalSince1970: millis / 1000)
        let sample = HKQuantitySample(
            type: caffeine,
            quantity: HKQuantity(unit: .gram(), doubleValue: grams),
            start: date,
            end: date
        )
        store.save(sample) { success, error in
            if success {
                call.resolve()
            } else {
                call.reject(error?.localizedDescription ?? "Not stored")
            }
        }
    }
}
