// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v17)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.6.2"),
        .package(name: "BeanconquerorTextRecognition", path: "../../../capacitor-plugins/text-recognition"),
        .package(name: "CapacitorCommunityKeepAwake", path: "../../../node_modules/.pnpm/@capacitor-community+keep-awake@8.0.1_@capacitor+core@8.6.2/node_modules/@capacitor-community/keep-awake"),
        .package(name: "CapacitorCommunityTextToSpeech", path: "../../../node_modules/.pnpm/@capacitor-community+text-to-speech@8.0.2_patch_hash=646e7b336b9e0c59ee44f250128db04562_b3232a7616bc58a09af2878644eceadd/node_modules/@capacitor-community/text-to-speech"),
        .package(name: "CapacitorApp", path: "../../../node_modules/.pnpm/@capacitor+app@8.1.2_@capacitor+core@8.6.2/node_modules/@capacitor/app"),
        .package(name: "CapacitorAppLauncher", path: "../../../node_modules/.pnpm/@capacitor+app-launcher@8.0.1_@capacitor+core@8.6.2/node_modules/@capacitor/app-launcher"),
        .package(name: "CapacitorBarcodeScanner", path: "../../../node_modules/.pnpm/@capacitor+barcode-scanner@3.1.4_@capacitor+core@8.6.2/node_modules/@capacitor/barcode-scanner"),
        .package(name: "CapacitorCamera", path: "../../../node_modules/.pnpm/@capacitor+camera@8.2.6_@capacitor+core@8.6.2/node_modules/@capacitor/camera"),
        .package(name: "CapacitorClipboard", path: "../../../node_modules/.pnpm/@capacitor+clipboard@8.0.1_@capacitor+core@8.6.2/node_modules/@capacitor/clipboard"),
        .package(name: "CapacitorDevice", path: "../../../node_modules/.pnpm/@capacitor+device@8.0.3_@capacitor+core@8.6.2/node_modules/@capacitor/device"),
        .package(name: "CapacitorFilesystem", path: "../../../node_modules/.pnpm/@capacitor+filesystem@8.1.5_@capacitor+core@8.6.2/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorGeolocation", path: "../../../node_modules/.pnpm/@capacitor+geolocation@8.2.5_@capacitor+core@8.6.2/node_modules/@capacitor/geolocation"),
        .package(name: "CapacitorHaptics", path: "../../../node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.6.2/node_modules/@capacitor/haptics"),
        .package(name: "CapacitorKeyboard", path: "../../../node_modules/.pnpm/@capacitor+keyboard@8.0.6_@capacitor+core@8.6.2/node_modules/@capacitor/keyboard"),
        .package(name: "CapacitorScreenReader", path: "../../../node_modules/.pnpm/@capacitor+screen-reader@8.0.1_@capacitor+core@8.6.2/node_modules/@capacitor/screen-reader"),
        .package(name: "CapacitorShare", path: "../../../node_modules/.pnpm/@capacitor+share@8.0.3_@capacitor+core@8.6.2/node_modules/@capacitor/share"),
        .package(name: "CapacitorSplashScreen", path: "../../../node_modules/.pnpm/@capacitor+splash-screen@8.0.2_@capacitor+core@8.6.2/node_modules/@capacitor/splash-screen"),
        .package(name: "CapacitorStatusBar", path: "../../../node_modules/.pnpm/@capacitor+status-bar@8.0.4_@capacitor+core@8.6.2/node_modules/@capacitor/status-bar"),
        .package(name: "CapawesomeCapacitorFilePicker", path: "../../../node_modules/.pnpm/@capawesome+capacitor-file-picker@8.1.1_@capacitor+core@8.6.2/node_modules/@capawesome/capacitor-file-picker"),
        .package(name: "CapgoCameraPreview", path: "../../../node_modules/.pnpm/@capgo+camera-preview@8.15.4_@capacitor+core@8.6.2/node_modules/@capgo/camera-preview"),
        .package(name: "CapgoCapacitorLlm", path: "../../../node_modules/.pnpm/@capgo+capacitor-llm@8.2.4_@capacitor+core@8.6.2_@mediapipe+tasks-genai@0.10.30/node_modules/@capgo/capacitor-llm"),
        .package(name: "CommunityCordovaPluginNfc", path: "../../capacitor-cordova-ios-plugins/sources/CommunityCordovaPluginNfc"),
        .package(name: "CordovaPluginBleCentral", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginBleCentral"),
        .package(name: "SkwasCordovaPluginDatetimepicker", path: "../../capacitor-cordova-ios-plugins/sources/SkwasCordovaPluginDatetimepicker")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "BeanconquerorTextRecognition", package: "BeanconquerorTextRecognition"),
                .product(name: "CapacitorCommunityKeepAwake", package: "CapacitorCommunityKeepAwake"),
                .product(name: "CapacitorCommunityTextToSpeech", package: "CapacitorCommunityTextToSpeech"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorAppLauncher", package: "CapacitorAppLauncher"),
                .product(name: "CapacitorBarcodeScanner", package: "CapacitorBarcodeScanner"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorClipboard", package: "CapacitorClipboard"),
                .product(name: "CapacitorDevice", package: "CapacitorDevice"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorGeolocation", package: "CapacitorGeolocation"),
                .product(name: "CapacitorHaptics", package: "CapacitorHaptics"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard"),
                .product(name: "CapacitorScreenReader", package: "CapacitorScreenReader"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorStatusBar", package: "CapacitorStatusBar"),
                .product(name: "CapawesomeCapacitorFilePicker", package: "CapawesomeCapacitorFilePicker"),
                .product(name: "CapgoCameraPreview", package: "CapgoCameraPreview"),
                .product(name: "CapgoCapacitorLlm", package: "CapgoCapacitorLlm"),
                .product(name: "CommunityCordovaPluginNfc", package: "CommunityCordovaPluginNfc"),
                .product(name: "CordovaPluginBleCentral", package: "CordovaPluginBleCentral"),
                .product(name: "SkwasCordovaPluginDatetimepicker", package: "SkwasCordovaPluginDatetimepicker")
            ]
        )
    ]
)
