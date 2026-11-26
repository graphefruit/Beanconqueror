import Capacitor
import Foundation
import UIKit
import Vision

@objc(TextRecognitionPlugin)
public class TextRecognitionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TextRecognitionPlugin"
    public let jsName = "TextRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "detectText", returnType: CAPPluginReturnPromise)
    ]

    @objc func detectText(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64Image"),
              let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data),
              let cgImage = image.cgImage
        else {
            call.reject("Could not decode the image")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest()
            request.revision = VNRecognizeTextRequestRevision3
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.automaticallyDetectsLanguage = true

            let handler = VNImageRequestHandler(
                cgImage: cgImage, orientation: CGImagePropertyOrientation(image.imageOrientation))
            do {
                try handler.perform([request])
            } catch {
                call.reject("Text recognition failed", nil, error)
                return
            }

            // UIImage(data:) has scale 1, so its oriented size is in pixels.
            let lines = (request.results ?? []).compactMap { observation -> RecognizedLine? in
                guard let text = observation.topCandidates(1).first?.string else { return nil }
                return RecognizedLine(
                    text: text,
                    box: pixelRect(fromNormalized: observation.boundingBox, imageSize: image.size))
            }
            call.resolve(Self.result(groupLinesIntoBlocks(lines)))
        }
    }

    private static func result(_ blocks: [[RecognizedLine]]) -> [String: Any] {
        let blockObjects = blocks.map { lines -> [String: Any] in
            [
                "text": lines.map(\.text).joined(separator: "\n"),
                "boundingBox": box(lines.map(\.box).reduce(lines[0].box) { $0.union($1) }),
                "recognizedLanguage": "",
                "lines": lines.map { line -> [String: Any] in
                    [
                        "text": line.text,
                        "boundingBox": box(line.box),
                        "recognizedLanguage": "",
                        // Nothing reads words; ML Kit's elements stay empty here.
                        "elements": [Any](),
                    ]
                },
            ]
        }
        return [
            "text": blocks.map { $0.map(\.text).joined(separator: "\n") }.joined(separator: "\n"),
            "blocks": blockObjects,
        ]
    }

    private static func box(_ rect: CGRect) -> [String: Int] {
        [
            "left": Int(rect.minX.rounded()),
            "top": Int(rect.minY.rounded()),
            "right": Int(rect.maxX.rounded()),
            "bottom": Int(rect.maxY.rounded()),
        ]
    }
}

private extension CGImagePropertyOrientation {
    init(_ orientation: UIImage.Orientation) {
        switch orientation {
        case .up: self = .up
        case .upMirrored: self = .upMirrored
        case .down: self = .down
        case .downMirrored: self = .downMirrored
        case .left: self = .left
        case .leftMirrored: self = .leftMirrored
        case .right: self = .right
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
