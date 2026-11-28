import UIKit
import Capacitor
import OSLog

/// Copies what this binary logs (ble-central's NSLog among it) and uncaught exceptions into
/// rotating native_*.log files next to the JS log, so a shared log also covers the native side.
enum NativeLog {
    private static let queue = DispatchQueue(label: "NativeLog", qos: .utility)
    private static let maxBytes = 1024 * 1024
    private static let filesKept = 3
    private static let interval = 30.0
    // "Discovered" carries name and advertising data of every device in range, also strangers'.
    private static let noise = ["didUpdateValueForCharacteristic", "writeWithoutResponse", "Discovered ", "[CapgoLLM]"]
    private static let binary = Bundle.main.executableURL?.lastPathComponent ?? "App"
    // Its own messages carry this subsystem, so collecting never reads them back into the file.
    private static let logger = Logger(subsystem: "\(Bundle.main.bundleIdentifier ?? "App").nativelog",
                                       category: "NativeLog")
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS Z"
        return formatter
    }()
    private static let nameFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyyMMdd_HHmmssSSS"
        return formatter
    }()
    private static let directory = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("NoCloud/logs", isDirectory: true)
    // Read by the exception handler without the queue, which may be the crashing thread.
    private static let crashPath = OSAllocatedUnfairLock<String?>(initialState: nil)
    private static var previousHandler: (@convention(c) (NSException) -> Void)?
    private static var started = false
    private static var file: (url: URL, size: Int)?
    private static var lastDate: Date?
    private static var timer: DispatchSourceTimer?

    static func start() {
        guard !started else { return }
        started = true
        previousHandler = NSGetUncaughtExceptionHandler()
        NSSetUncaughtExceptionHandler { exception in
            let text = ([NativeLog.line(Date(), "F", "BeanConqueror",
                                        "uncaught \(exception.name.rawValue): \(exception.reason ?? "")")]
                        + exception.callStackSymbols).joined(separator: "\n") + "\n"
            let path = NativeLog.crashPath.withLock { $0 }
                ?? NativeLog.directory.appendingPathComponent(NativeLog.newName(Date())).path
            let fd = open(path, O_WRONLY | O_APPEND | O_CREAT, 0o644)
            if fd >= 0 {
                _ = text.withCString { write(fd, $0, strlen($0)) }
                close(fd)
            }
            NativeLog.previousHandler?(exception)
        }
        let center = NotificationCenter.default
        center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: nil) { _ in
            queue.async { startTimer() }
        }
        center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: nil) { _ in
            queue.async {
                timer?.cancel()
                timer = nil
                collect()
            }
        }
        // Keeps the app awake until the collect queued on resigning active is written. A second
        // collect here would cost as much again, since every collect reads the whole process log.
        center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { _ in
            var task = UIBackgroundTaskIdentifier.invalid
            let end = {
                guard task != .invalid else { return }
                UIApplication.shared.endBackgroundTask(task)
                task = .invalid
            }
            task = UIApplication.shared.beginBackgroundTask(withName: "NativeLog", expirationHandler: end)
            queue.async { DispatchQueue.main.async(execute: end) }
        }
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        let system = UIDevice.current.systemVersion
        queue.async {
            do {
                try prepareDirectory()
                append([line(Date(), "I", "BeanConqueror", "start \(version) (\(build)) iOS \(system)")])
            } catch {
                logger.warning("NativeLog: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    /// Collects the pending entries before the log files are shared.
    static func flush(_ done: @escaping () -> Void) {
        queue.async {
            collect()
            done()
        }
    }

    private static func startTimer() {
        guard timer == nil else { return }
        let source = DispatchSource.makeTimerSource(queue: queue)
        source.schedule(deadline: .now() + interval, repeating: interval)
        source.setEventHandler {
            // getEntries reads every entry of the process, so a collect gets slower the longer
            // the app runs (ble-central logs each notification); stay below 1 % of the time.
            let seconds = collect()
            let next = max(interval, seconds * 100)
            source.schedule(deadline: .now() + next, repeating: next)
        }
        source.resume()
        timer = source
    }

    private static func prepareDirectory() throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var url = directory
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try url.setResourceValues(values)
    }

    @discardableResult
    private static func collect() -> Double {
        let started = Date()
        do {
            let store = try OSLogStore(scope: .currentProcessIdentifier)
            let entries = try store.getEntries(at: lastDate.map { store.position(date: $0) })
            var lines: [String] = []
            for case let entry as OSLogEntryLog in entries where entry.date > (lastDate ?? .distantPast) {
                lastDate = entry.date
                // NSLog (ble-central, Cordova plugins) is logged by Foundation without a subsystem.
                let isNSLog = entry.sender == "Foundation" && entry.subsystem.isEmpty
                let isOwn = entry.sender == binary && !entry.subsystem.hasPrefix("com.apple")
                    && !entry.subsystem.hasSuffix(".nativelog")
                let message = entry.composedMessage
                // A bare object dump (scan service data, NFC payloads) starts with a bracket.
                let isDump = isNSLog && message.first.map { "{(<".contains($0) } ?? false
                if (isNSLog || isOwn) && !isDump && !noise.contains(where: { message.contains($0) }) {
                    lines.append(line(entry.date, level(entry.level), isNSLog ? "NSLog" : entry.sender, message))
                }
            }
            append(lines)
        } catch {
            logger.warning("NativeLog: \(error.localizedDescription, privacy: .public)")
        }
        let seconds = Date().timeIntervalSince(started)
        logger.debug("NativeLog: collect took \(seconds, privacy: .public) s")
        if seconds > 0.2 {
            append([line(Date(), "W", "BeanConqueror", String(format: "slow log collect %.2f s", seconds))])
        }
        return seconds
    }

    private static func append(_ lines: [String]) {
        guard !lines.isEmpty else { return }
        let data = Data((lines.joined(separator: "\n") + "\n").utf8)
        do {
            let now = Date()
            let today = String(nameFormatter.string(from: now).prefix(8))
            if file == nil {
                file = try newestFile()
            }
            let fits = file.map { $0.url.lastPathComponent.dropFirst(7).hasPrefix(today)
                && $0.size + data.count <= maxBytes } ?? false
            if !fits {
                try prepareDirectory()
                let url = directory.appendingPathComponent(newName(now))
                FileManager.default.createFile(atPath: url.path, contents: nil)
                file = (url, 0)
                crashPath.withLock { $0 = url.path }
                try deleteOldestFiles()
            }
            guard let current = file else { return }
            let handle = try FileHandle(forWritingTo: current.url)
            defer { try? handle.close() }
            try handle.seekToEnd()
            try handle.write(contentsOf: data)
            file = (current.url, current.size + data.count)
        } catch {
            // The next block starts a new file in case this one is gone.
            file = nil
            crashPath.withLock { $0 = nil }
            logger.warning("NativeLog: \(error.localizedDescription, privacy: .public)")
        }
    }

    private static func newestFile() throws -> (url: URL, size: Int)? {
        guard let name = try fileNames().last else { return nil }
        let url = directory.appendingPathComponent(name)
        let size = try FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int ?? 0
        crashPath.withLock { $0 = url.path }
        return (url, size)
    }

    private static func deleteOldestFiles() throws {
        for name in try fileNames().dropLast(filesKept) {
            try FileManager.default.removeItem(at: directory.appendingPathComponent(name))
        }
    }

    /// The native log files, oldest first; the JS log files are left alone.
    private static func fileNames() throws -> [String] {
        guard FileManager.default.fileExists(atPath: directory.path) else { return [] }
        return try FileManager.default.contentsOfDirectory(atPath: directory.path)
            .filter { $0.range(of: #"^native_\d{8}_\d{9}\.log$"#, options: .regularExpression) != nil }
            .sorted()
    }

    private static func newName(_ date: Date) -> String {
        "native_\(nameFormatter.string(from: date)).log"
    }

    private static func line(_ date: Date, _ level: String, _ sender: String, _ message: String) -> String {
        "\(dateFormatter.string(from: date)) \(level) \(sender): \(message)"
    }

    private static func level(_ level: OSLogEntryLog.Level) -> String {
        switch level {
        case .debug: return "D"
        case .info: return "I"
        case .notice: return "N"
        case .error: return "E"
        case .fault: return "F"
        default: return "-"
        }
    }
}

@objc(NativeLogPlugin)
class NativeLogPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "NativeLogPlugin"
    let jsName = "NativeLog"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "flush", returnType: CAPPluginReturnPromise)
    ]

    @objc func flush(_ call: CAPPluginCall) {
        NativeLog.flush { call.resolve() }
    }
}

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
    private let nativeLogPlugin = NativeLogPlugin()
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
        capacitorViewController.bridge?.registerPluginInstance(nativeLogPlugin)
        capacitorViewController.bridge?.registerPluginInstance(WidgetPlugin())
        capacitorViewController.bridge?.registerPluginInstance(CaffeineHealthPlugin())
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
        NativeLog.start()
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
