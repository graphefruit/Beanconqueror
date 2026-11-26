// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BeanconquerorTextRecognition",
    platforms: [.iOS(.v17)],
    products: [
        .library(
            name: "BeanconquerorTextRecognition",
            targets: ["TextRecognitionPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "TextRecognitionPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/TextRecognitionPlugin"),
        .testTarget(
            name: "TextRecognitionPluginTests",
            dependencies: ["TextRecognitionPlugin"],
            path: "ios/Tests/TextRecognitionPluginTests")
    ]
)
