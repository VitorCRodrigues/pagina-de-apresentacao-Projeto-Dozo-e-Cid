import Foundation

/// Removes what a photo says beyond its pixels before it is sent: EXIF (position, the phone, the
/// date), XMP, IPTC, comments and text. A phone photo often carries where it was taken; the
/// document Interactive Brokers asks for does not need it (CLAUDE.md, no personal data where it is
/// not needed). Works on the bytes, with Foundation only, so it is tested on every platform; the
/// app re-encodes photos first (DocumentImagePolicy), and this runs on every file anyway.
public enum ImageMetadata {
    /// The image could not be read to the end: it is refused, never sent half cleaned.
    public struct Unreadable: Error, Sendable, Equatable {}

    /// The image without metadata. A PDF, or anything that is not a JPEG or PNG, comes back as
    /// it was (TODO(decisão) 33: PDF metadata stays).
    public static func stripped(_ data: Data) throws -> Data {
        switch DocumentType.sniff(data) {
        case .jpeg: try strippedJPEG([UInt8](data))
        case .png: try strippedPNG([UInt8](data))
        case .pdf, nil: data
        }
    }

    // MARK: JPEG

    /// Kept: the JFIF header (APP0), the colour profile (APP2 ICC_PROFILE), Adobe's colour flag
    /// (APP14) and everything that draws the image. Dropped: the other APPn segments (EXIF and XMP
    /// in APP1, MPF in APP2, IPTC in APP13...), comments, and anything after the end of the image
    /// (the extra pictures of a multi-picture file, with their own EXIF).
    private static func strippedJPEG(_ bytes: [UInt8]) throws -> Data {
        var output: [UInt8] = [0xFF, 0xD8]
        output.reserveCapacity(bytes.count)
        var index = 2
        var inScan = false

        while index < bytes.count {
            if inScan {
                // Entropy-coded data: copy until a real marker (not a stuffed FF00 or a restart).
                let start = index
                while index < bytes.count {
                    if bytes[index] == 0xFF, index + 1 < bytes.count {
                        let next = bytes[index + 1]
                        if next != 0x00, !(0xD0...0xD7).contains(next), next != 0xFF { break }
                    }
                    index += 1
                }
                output.append(contentsOf: bytes[start..<index])
                guard index + 1 < bytes.count else { throw Unreadable() }
                inScan = false
                continue
            }

            guard bytes[index] == 0xFF, index + 1 < bytes.count else { throw Unreadable() }
            let marker = bytes[index + 1]
            if marker == 0xFF { index += 1; continue }  // fill byte
            if marker == 0xD9 {
                output.append(contentsOf: [0xFF, 0xD9])
                return Data(output)
            }
            if (0xD0...0xD7).contains(marker) || marker == 0x01 {
                output.append(contentsOf: [0xFF, marker])
                index += 2
                continue
            }
            guard index + 4 <= bytes.count else { throw Unreadable() }
            let length = Int(bytes[index + 2]) << 8 | Int(bytes[index + 3])
            let end = index + 2 + length
            guard length >= 2, end <= bytes.count else { throw Unreadable() }
            if keeps(marker, payload: bytes[(index + 4)..<end]) {
                output.append(contentsOf: bytes[index..<end])
            }
            index = end
            if marker == 0xDA { inScan = true }
        }
        throw Unreadable()  // no end of image
    }

    private static func keeps(_ marker: UInt8, payload: ArraySlice<UInt8>) -> Bool {
        switch marker {
        case 0xE0: payload.starts(with: Array("JFIF\u{0}".utf8)) || payload.starts(with: Array("JFXX\u{0}".utf8))
        case 0xE2: payload.starts(with: Array("ICC_PROFILE\u{0}".utf8))
        case 0xEE: payload.starts(with: Array("Adobe".utf8))
        case 0xE1, 0xE3...0xED, 0xEF, 0xFE: false
        default: true
        }
    }

    // MARK: PNG

    /// Kept: the chunks that draw the image and its colours (and APNG's frames). Dropped: eXIf,
    /// tEXt, zTXt, iTXt, tIME and any private chunk. Kept chunks are copied as they were, CRC
    /// included.
    private static let pngKept: Set<String> = [
        "IHDR", "PLTE", "IDAT", "IEND", "tRNS", "cHRM", "gAMA", "iCCP", "sBIT", "sRGB", "bKGD",
        "pHYs", "hIST", "sPLT", "acTL", "fcTL", "fdAT",
    ]

    private static func strippedPNG(_ bytes: [UInt8]) throws -> Data {
        var output = Array(bytes[0..<8])
        var index = 8
        while index + 12 <= bytes.count {
            let length = Int(bytes[index]) << 24 | Int(bytes[index + 1]) << 16 | Int(bytes[index + 2]) << 8 | Int(bytes[index + 3])
            let end = index + 12 + length
            guard length >= 0, end <= bytes.count else { throw Unreadable() }
            let type = String(decoding: bytes[(index + 4)..<(index + 8)], as: UTF8.self)
            if pngKept.contains(type) { output.append(contentsOf: bytes[index..<end]) }
            index = end
            if type == "IEND" { return Data(output) }
        }
        throw Unreadable()  // no IEND
    }
}
