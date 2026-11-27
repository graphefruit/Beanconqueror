import CoreGraphics

/// One recognized line with its box in image pixels, origin top left.
struct RecognizedLine: Equatable {
    let text: String
    let box: CGRect
}

/// Vision boxes are normalized with the origin at the bottom left.
func pixelRect(fromNormalized rect: CGRect, imageSize: CGSize) -> CGRect {
    CGRect(
        x: rect.minX * imageSize.width,
        y: (1 - rect.maxY) * imageSize.height,
        width: rect.width * imageSize.width,
        height: rect.height * imageSize.height)
}

/// Lines further apart than this share of the smaller line height start a new block.
let maxLineGapRatio: CGFloat = 0.8
/// Lines whose heights differ more than this ratio are different font sizes.
let minLineHeightRatio: CGFloat = 0.7

/// Vision returns lines only, but the size classification compares blocks
/// like ML Kit's paragraphs: a line joins the block whose last line sits just
/// above it, overlaps it horizontally and has a similar height.
/// Blocks keep reading order by their first line, top to bottom.
func groupLinesIntoBlocks(_ lines: [RecognizedLine]) -> [[RecognizedLine]] {
    let sorted = lines.enumerated().sorted { a, b in
        a.element.box.minY != b.element.box.minY
            ? a.element.box.minY < b.element.box.minY
            : a.offset < b.offset
    }.map(\.element)

    var blocks: [[RecognizedLine]] = []
    for line in sorted {
        if let index = blocks.firstIndex(where: { continuesBlock($0.last!, with: line) }) {
            blocks[index].append(line)
        } else {
            blocks.append([line])
        }
    }
    return blocks
}

private func continuesBlock(_ previous: RecognizedLine, with line: RecognizedLine) -> Bool {
    let a = previous.box
    let b = line.box
    let minHeight = min(a.height, b.height)
    let maxHeight = max(a.height, b.height)
    guard minHeight > 0, minHeight / maxHeight >= minLineHeightRatio else { return false }
    let gap = b.minY - a.maxY
    let overlapsHorizontally = min(a.maxX, b.maxX) > max(a.minX, b.minX)
    return b.minY > a.minY && gap <= minHeight * maxLineGapRatio && overlapsHorizontally
}
