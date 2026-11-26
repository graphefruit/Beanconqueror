import CoreGraphics
import XCTest
@testable import TextRecognitionPlugin

final class TextBlockGroupingTests: XCTestCase {
    private func line(_ text: String, x: CGFloat = 0, y: CGFloat, width: CGFloat = 100, height: CGFloat = 20) -> RecognizedLine {
        RecognizedLine(text: text, box: CGRect(x: x, y: y, width: width, height: height))
    }

    private func texts(_ blocks: [[RecognizedLine]]) -> [[String]] {
        blocks.map { $0.map(\.text) }
    }

    func testConvertsNormalizedBottomLeftBoxToTopLeftPixels() {
        let rect = pixelRect(
            fromNormalized: CGRect(x: 0.1, y: 0.2, width: 0.5, height: 0.1),
            imageSize: CGSize(width: 1000, height: 2000))
        XCTAssertEqual(rect.minX, 100, accuracy: 0.001)
        XCTAssertEqual(rect.maxX, 600, accuracy: 0.001)
        XCTAssertEqual(rect.minY, 1400, accuracy: 0.001)
        XCTAssertEqual(rect.maxY, 1600, accuracy: 0.001)
    }

    func testGroupsCloseLinesOfSimilarHeightIntoOneBlock() {
        let blocks = groupLinesIntoBlocks([
            line("second", y: 125),
            line("first", y: 100),
        ])
        XCTAssertEqual(texts(blocks), [["first", "second"]])
    }

    func testSplitsLinesWithLargeGap() {
        let blocks = groupLinesIntoBlocks([line("a", y: 100), line("b", y: 140)])
        XCTAssertEqual(texts(blocks), [["a"], ["b"]])
    }

    func testSplitsLinesOfDifferentSize() {
        let blocks = groupLinesIntoBlocks([
            line("Title", y: 50, height: 60),
            line("body", y: 115),
        ])
        XCTAssertEqual(texts(blocks), [["Title"], ["body"]])
    }

    func testSplitsColumnsWithoutHorizontalOverlapAndKeepsReadingOrder() {
        let blocks = groupLinesIntoBlocks([
            line("left 1", x: 0, y: 100),
            line("right 1", x: 300, y: 102),
            line("left 2", x: 0, y: 125),
            line("right 2", x: 300, y: 127),
        ])
        XCTAssertEqual(texts(blocks), [["left 1", "left 2"], ["right 1", "right 2"]])
    }

    func testIgnoresLinesWithoutHeight() {
        let blocks = groupLinesIntoBlocks([line("a", y: 100), line("flat", y: 121, height: 0)])
        XCTAssertEqual(texts(blocks), [["a"], ["flat"]])
    }

    func testEmptyInputGivesNoBlocks() {
        XCTAssertTrue(groupLinesIntoBlocks([]).isEmpty)
    }
}
