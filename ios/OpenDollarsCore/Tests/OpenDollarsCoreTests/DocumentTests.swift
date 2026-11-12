import Foundation
import Testing
@testable import OpenDollarsCore

// T3: the documents Interactive Brokers asks for. Rules with no UI in them: the file's type, the
// limits, the size shown, metadata removal, the multipart body and the upload timeouts.

// MARK: - Fixtures

/// Sample photos made with Pillow: 64x40 px, EXIF with maker, model, software and a GPS position
/// (Buenos Aires), plus a JPEG comment. Tests/OpenDollarsCoreTests/Fixtures.
enum DocumentFixtures {
    static func data(_ name: String, _ ext: String) -> Data {
        guard let url = Bundle.module.url(forResource: name, withExtension: ext, subdirectory: "Fixtures"),
              let data = try? Data(contentsOf: url)
        else { fatalError("missing fixture \(name).\(ext)") }
        return data
    }

    static var jpegWithGPS: Data { data("photo-with-gps", "jpg") }
    static var pngWithGPS: Data { data("photo-with-gps", "png") }

    /// The smallest file each type is recognised by.
    static let pdf = Data("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n".utf8)
    static let heic = Data([0, 0, 0, 0x18] + Array("ftypheic".utf8) + [0, 0, 0, 0] + Array("mif1heic".utf8))
    static let text = Data("not a document".utf8)

    /// An XMP packet carrying a position, the way some phones and editors write it.
    static let xmpWithGPS = Data((
        "http://ns.adobe.com/xap/1.0/\u{0}"
        + "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\"><rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">"
        + "<rdf:Description xmlns:exif=\"http://ns.adobe.com/exif/1.0/\" exif:GPSLatitude=\"34,36.2S\" exif:GPSLongitude=\"58,22.9W\"/>"
        + "</rdf:RDF></x:xmpmeta>").utf8)

    /// The JPEG fixture with an extra APP1 XMP segment after APP0.
    static var jpegWithXMP: Data {
        let jpeg = jpegWithGPS
        let app0Length = Int(jpeg[4]) << 8 | Int(jpeg[5])
        let insertAt = 4 + app0Length
        let length = xmpWithGPS.count + 2
        var segment = Data([0xFF, 0xE1, UInt8(length >> 8), UInt8(length & 0xFF)])
        segment.append(xmpWithGPS)
        var result = Data(jpeg.prefix(insertAt))
        result.append(segment)
        result.append(jpeg.dropFirst(insertAt))
        return result
    }
}

// MARK: - Independent readers (not the code under test)

/// The segments of a JPEG up to the start of scan: (marker, payload).
func jpegSegments(_ data: Data) -> [(marker: UInt8, payload: Data)] {
    let bytes = [UInt8](data)
    var segments: [(UInt8, Data)] = []
    var index = 2
    while index + 4 <= bytes.count, bytes[index] == 0xFF {
        let marker = bytes[index + 1]
        let length = Int(bytes[index + 2]) << 8 | Int(bytes[index + 3])
        segments.append((marker, Data(bytes[(index + 4)..<min(index + 2 + length, bytes.count)])))
        if marker == 0xDA { break }
        index += 2 + length
    }
    return segments
}

/// From the start of scan to the end: the compressed image itself.
func jpegScan(_ data: Data) -> Data {
    let bytes = [UInt8](data)
    var index = 2
    while index + 4 <= bytes.count, bytes[index] == 0xFF {
        if bytes[index + 1] == 0xDA { return Data(bytes[index...]) }
        index += 2 + (Int(bytes[index + 2]) << 8 | Int(bytes[index + 3]))
    }
    return Data()
}

/// The tags of IFD0 in an APP1 Exif payload, read the way any EXIF reader does.
func exifIFD0Tags(_ payload: Data) -> [UInt16] {
    let bytes = [UInt8](payload)
    guard bytes.count > 14, Array(bytes[0..<6]) == Array("Exif\u{0}\u{0}".utf8) else { return [] }
    let tiff = 6
    let bigEndian = bytes[tiff] == 0x4D
    func u16(_ at: Int) -> Int { bigEndian ? Int(bytes[at]) << 8 | Int(bytes[at + 1]) : Int(bytes[at + 1]) << 8 | Int(bytes[at]) }
    func u32(_ at: Int) -> Int { bigEndian ? u16(at) << 16 | u16(at + 2) : u16(at + 2) << 16 | u16(at) }
    let ifd = tiff + u32(tiff + 4)
    return (0..<u16(ifd)).map { UInt16(u16(ifd + 2 + $0 * 12)) }
}

/// The chunks of a PNG: (type, whole chunk with length and CRC).
func pngChunks(_ data: Data) -> [(type: String, raw: Data)] {
    let bytes = [UInt8](data)
    var chunks: [(String, Data)] = []
    var index = 8
    while index + 12 <= bytes.count {
        let length = Int(bytes[index]) << 24 | Int(bytes[index + 1]) << 16 | Int(bytes[index + 2]) << 8 | Int(bytes[index + 3])
        let type = String(decoding: bytes[(index + 4)..<(index + 8)], as: UTF8.self)
        chunks.append((type, Data(bytes[index..<(index + 12 + length)])))
        index += 12 + length
    }
    return chunks
}

private let gpsInfoTag: UInt16 = 0x8825

// MARK: - Type, limits, size

@Suite struct DocumentTypeTests {
    @Test func theTypeComesFromTheContentNotTheName() {
        #expect(DocumentType.sniff(DocumentFixtures.jpegWithGPS) == .jpeg)
        #expect(DocumentType.sniff(DocumentFixtures.pngWithGPS) == .png)
        #expect(DocumentType.sniff(DocumentFixtures.pdf) == .pdf)
        // HEIC comes from the Photos library and is converted to JPEG before this point.
        #expect(DocumentType.sniff(DocumentFixtures.heic) == nil)
        #expect(DocumentType.sniff(DocumentFixtures.text) == nil)
        #expect(DocumentType.sniff(Data()) == nil)
    }

    @Test func eachTypeHasItsMediaTypeAndAGenericFileName() {
        #expect(DocumentType.jpeg.mimeType == "image/jpeg")
        #expect(DocumentType.png.mimeType == "image/png")
        #expect(DocumentType.pdf.mimeType == "application/pdf")
        // The name the server receives never carries the client's own file name.
        #expect(DocumentType.jpeg.uploadFileName == "document.jpg")
        #expect(DocumentType.pdf.uploadFileName == "document.pdf")
    }
}

@Suite struct DocumentRulesTests {
    @Test func jpgPngAndPdfUpTo10MBAreAccepted() {
        #expect(DocumentRules.maxBytes == 10 * 1024 * 1024)
        #expect(DocumentRules.problem(DocumentFixtures.jpegWithGPS) == nil)
        #expect(DocumentRules.problem(DocumentFixtures.pdf) == nil)
        var exactlyMax = DocumentFixtures.pdf
        exactlyMax.append(Data(count: DocumentRules.maxBytes - exactlyMax.count))
        #expect(DocumentRules.problem(exactlyMax) == nil)
    }

    @Test func emptyWrongTypeAndTooBigAreRefusedWithTheWebsCodes() {
        #expect(DocumentRules.problem(Data()) == .empty)
        #expect(DocumentRules.problem(DocumentFixtures.text) == .wrongType)
        #expect(DocumentRules.problem(DocumentFixtures.heic) == .wrongType)
        var tooBig = DocumentFixtures.pdf
        tooBig.append(Data(count: DocumentRules.maxBytes + 1 - tooBig.count))
        #expect(DocumentRules.problem(tooBig) == .tooBig)
        #expect(DocumentProblem.tooBig.copyKey == "account.upload.tooBig")
        #expect(DocumentProblem.wrongType.copyKey == "account.upload.wrongType")
        #expect(DocumentProblem.empty.copyKey == "account.upload.empty")
    }
}

@Suite struct FileSizeFormatterTests {
    // Same strings as the web's formatFileSize (Intl, maximumFractionDigits 1), byte for byte.
    @Test(arguments: [
        (0, "0,1 kB", "0.1 kB"), (50, "0,1 kB", "0.1 kB"), (1536, "1,5 kB", "1.5 kB"),
        (348_160, "340 kB", "340 kB"), (1_048_576, "1 MB", "1 MB"), (1_258_291, "1,2 MB", "1.2 MB"),
        (10_485_760, "10 MB", "10 MB"), (10_380_902, "9,9 MB", "9.9 MB"), (1_048_535, "1.024 kB", "1,024 kB"),
    ])
    func matchesTheWeb(bytes: Int, spanish: String, english: String) {
        #expect(FileSizeFormatter.format(bytes: bytes, locale: .es) == spanish)
        #expect(FileSizeFormatter.format(bytes: bytes, locale: .pt) == spanish)
        #expect(FileSizeFormatter.format(bytes: bytes, locale: .en) == english)
    }
}

// MARK: - Photos: size before the limit

@Suite struct DocumentImagePolicyTests {
    @Test func photosShrinkToAbout3000PxOnTheLongerSideAsCompressedJPEG() {
        #expect(DocumentImagePolicy.maxPixelSide == 3000)
        #expect(DocumentImagePolicy.jpegQuality > 0.5 && DocumentImagePolicy.jpegQuality < 0.9)
        // A 12 MP phone photo, landscape and portrait, and a 48 MP one.
        #expect(DocumentImagePolicy.targetSize(width: 4032, height: 3024) == PixelSize(width: 3000, height: 2250))
        #expect(DocumentImagePolicy.targetSize(width: 3024, height: 4032) == PixelSize(width: 2250, height: 3000))
        #expect(DocumentImagePolicy.targetSize(width: 8064, height: 6048) == PixelSize(width: 3000, height: 2250))
        #expect(DocumentImagePolicy.targetSize(width: 4000, height: 2999) == PixelSize(width: 3000, height: 2249))
    }

    @Test func smallerImagesKeepTheirSizeAndNothingGoesToZero() {
        #expect(DocumentImagePolicy.targetSize(width: 1200, height: 800) == PixelSize(width: 1200, height: 800))
        #expect(DocumentImagePolicy.targetSize(width: 3000, height: 10) == PixelSize(width: 3000, height: 10))
        #expect(DocumentImagePolicy.targetSize(width: 10000, height: 1) == PixelSize(width: 3000, height: 1))
    }

    @Test func theWorstCaseOfAShrunkPhotoFitsTheLimit() {
        // The largest area after shrinking is 3000x3000 px. Even at 8 bits per pixel (1 byte; a
        // very noisy phone photo at quality 0.8 is 2 to 4 bits), the file stays under 10 MB, so a
        // normal phone photo is never refused for its size.
        let side = DocumentImagePolicy.maxPixelSide
        let bytesAtEightBitsPerPixel = side * side
        #expect(bytesAtEightBitsPerPixel < DocumentRules.maxBytes)
    }

    // A scan of many pages is one PDF under the same 10 MB: it is built again with smaller pages
    // until it fits, so a long statement is not refused for its size.
    @Test func aLongScanIsBuiltWithSmallerPagesUntilItFits() {
        #expect(DocumentImagePolicy.scanPageSides.first == DocumentImagePolicy.maxPixelSide)
        #expect(DocumentImagePolicy.scanPageSides == DocumentImagePolicy.scanPageSides.sorted(by: >))
        var tried: [Int] = []
        let pdf = DocumentImagePolicy.firstThatFits(DocumentImagePolicy.scanPageSides) { side in
            tried.append(side)
            return Data(count: side == DocumentImagePolicy.maxPixelSide ? 12 * 1024 * 1024 : 6 * 1024 * 1024)
        }
        #expect(tried == Array(DocumentImagePolicy.scanPageSides.prefix(2)))
        #expect(pdf?.count == 6 * 1024 * 1024)
    }

    @Test func aSmallerStepKeepsTheProportions() {
        #expect(DocumentImagePolicy.targetSize(width: 2480, height: 3508, maxSide: 1600) == PixelSize(width: 1131, height: 1600))
        #expect(DocumentImagePolicy.targetSize(width: 1000, height: 800, maxSide: 1600) == PixelSize(width: 1000, height: 800))
    }

    @Test func aShortScanKeepsTheFullSize() {
        var tried: [Int] = []
        let pdf = DocumentImagePolicy.firstThatFits(DocumentImagePolicy.scanPageSides) { side in
            tried.append(side)
            return Data(count: 2 * 1024 * 1024)
        }
        #expect(tried == [DocumentImagePolicy.maxPixelSide])
        #expect(pdf?.count == 2 * 1024 * 1024)
    }

    @Test func whenNothingFitsTheSmallestIsKeptSoTheClientSeesTheLimit() {
        let pdf = DocumentImagePolicy.firstThatFits(DocumentImagePolicy.scanPageSides) { side in Data(count: DocumentRules.maxBytes + side) }
        #expect(pdf?.count == DocumentRules.maxBytes + (DocumentImagePolicy.scanPageSides.last ?? 0))
        #expect(DocumentImagePolicy.firstThatFits(DocumentImagePolicy.scanPageSides) { _ in nil } == nil)
    }
}

// MARK: - Metadata

@Suite struct ImageMetadataTests {
    @Test func theFixtureReallyCarriesAPosition() {
        let segments = jpegSegments(DocumentFixtures.jpegWithGPS)
        let exif = segments.first { $0.marker == 0xE1 }
        #expect(exif != nil)
        let tags = exifIFD0Tags(exif?.payload ?? Data())
        #expect(tags.contains(gpsInfoTag))
        #expect(segments.contains { $0.marker == 0xFE })  // the comment
    }

    @Test func aJPEGLosesItsEXIFWithThePositionAndItsComment() throws {
        let original = DocumentFixtures.jpegWithGPS
        let cleaned = try ImageMetadata.stripped(original)
        let markers = jpegSegments(cleaned).map(\.marker)
        #expect(!markers.contains(0xE1))
        #expect(!markers.contains(0xFE))
        #expect(!markers.contains { (0xE3...0xED).contains($0) || $0 == 0xEF })
        #expect(cleaned.range(of: Data("Exif".utf8)) == nil)
        #expect(cleaned.range(of: Data("SampleMaker".utf8)) == nil)
        #expect(cleaned.range(of: Data("SamplePhone".utf8)) == nil)
        // Still the same picture: JFIF header kept, the compressed image untouched.
        #expect(cleaned.prefix(2) == Data([0xFF, 0xD8]))
        #expect(cleaned.suffix(2) == Data([0xFF, 0xD9]))
        #expect(markers.first == 0xE0)
        #expect(markers.contains(0xDB) && markers.contains(0xC0) && markers.contains(0xC4))
        #expect(jpegScan(cleaned) == jpegScan(original))
        #expect(cleaned.count < original.count)
    }

    @Test func anXMPPacketWithAPositionGoesToo() throws {
        let original = DocumentFixtures.jpegWithXMP
        #expect(original.range(of: Data("GPSLatitude".utf8)) != nil)
        let cleaned = try ImageMetadata.stripped(original)
        #expect(cleaned.range(of: Data("GPSLatitude".utf8)) == nil)
        #expect(cleaned.range(of: Data("ns.adobe.com/xap".utf8)) == nil)
        #expect(jpegScan(cleaned) == jpegScan(original))
    }

    @Test func aPNGLosesItsEXIFAndTextChunks() throws {
        let original = DocumentFixtures.pngWithGPS
        #expect(pngChunks(original).contains { $0.type == "eXIf" })
        let cleaned = try ImageMetadata.stripped(original)
        let types = pngChunks(cleaned).map(\.type)
        #expect(!types.contains { ["eXIf", "tEXt", "zTXt", "iTXt", "tIME"].contains($0) })
        #expect(cleaned.range(of: Data("SampleMaker".utf8)) == nil)
        #expect(types.first == "IHDR" && types.last == "IEND" && types.contains("IDAT"))
        // The kept chunks are copied as they were, CRC included.
        let kept = pngChunks(original).filter { types.contains($0.type) }.map(\.raw)
        #expect(pngChunks(cleaned).map(\.raw) == kept)
    }

    @Test func aPDFIsLeftAsItIs() throws {
        // TODO(decisão): PDF metadata (Info, XMP) is not removed; the scanner's PDF is built by
        // the app without any, and a PDF from Files is sent as the client chose it.
        #expect(try ImageMetadata.stripped(DocumentFixtures.pdf) == DocumentFixtures.pdf)
    }

    @Test func aBrokenImageIsRefusedNotSentHalfCleaned() {
        let truncated = DocumentFixtures.jpegWithGPS.prefix(40)
        #expect(throws: ImageMetadata.Unreadable.self) { try ImageMetadata.stripped(Data(truncated)) }
        let badPNG = DocumentFixtures.pngWithGPS.prefix(30)
        #expect(throws: ImageMetadata.Unreadable.self) { try ImageMetadata.stripped(Data(badPNG)) }
    }
}

// MARK: - Preparing what is sent

@Suite struct PreparedDocumentTests {
    @Test func preparingRemovesThePositionBeforeTheLimitIsChecked() throws {
        let prepared = try PreparedDocument.prepare(DocumentFixtures.jpegWithGPS, displayName: "IMG_0042.jpg").get()
        #expect(prepared.type == .jpeg)
        #expect(prepared.displayName == "IMG_0042.jpg")
        #expect(prepared.data == (try ImageMetadata.stripped(DocumentFixtures.jpegWithGPS)))
        #expect(prepared.data.range(of: Data("Exif".utf8)) == nil)
        #expect(prepared.byteCount == prepared.data.count)
    }

    @Test func problemsComeBackAsTheWebsCodes() {
        #expect(PreparedDocument.prepare(Data(), displayName: "x").failure == .empty)
        #expect(PreparedDocument.prepare(DocumentFixtures.text, displayName: "x").failure == .wrongType)
        #expect(PreparedDocument.prepare(DocumentFixtures.heic, displayName: "x").failure == .wrongType)
        #expect(PreparedDocument.prepare(Data(DocumentFixtures.jpegWithGPS.prefix(40)), displayName: "x").failure == .wrongType)
        var tooBig = DocumentFixtures.pdf
        tooBig.append(Data(count: DocumentRules.maxBytes + 1 - tooBig.count))
        #expect(PreparedDocument.prepare(tooBig, displayName: "x").failure == .tooBig)
    }

    @Test func eachPreparedDocumentIsItsOwnIntent() throws {
        // One Idempotency-Key per document: a retry of the same one resends its key, a new file
        // gets a new one.
        let first = try PreparedDocument.prepare(DocumentFixtures.pdf, displayName: "a.pdf").get()
        let second = try PreparedDocument.prepare(DocumentFixtures.pdf, displayName: "a.pdf").get()
        #expect(first.idempotencyKey == first.idempotencyKey)
        #expect(first.idempotencyKey != second.idempotencyKey)
    }
}

extension Result {
    var failure: Failure? {
        if case .failure(let failure) = self { failure } else { nil }
    }
}

// MARK: - Multipart and timeouts

@Suite struct MultipartBodyTests {
    @Test func thePendingItemAndTheFileGoAsFormData() {
        var body = MultipartBody(boundary: "od-boundary")
        body.addField(name: "pendingItemId", value: "pend-dni-back")
        body.addFile(name: "file", fileName: "document.pdf", contentType: "application/pdf", data: Data("%PDF".utf8))
        let expected = "--od-boundary\r\n"
            + "Content-Disposition: form-data; name=\"pendingItemId\"\r\n\r\n"
            + "pend-dni-back\r\n"
            + "--od-boundary\r\n"
            + "Content-Disposition: form-data; name=\"file\"; filename=\"document.pdf\"\r\n"
            + "Content-Type: application/pdf\r\n\r\n"
            + "%PDF\r\n"
            + "--od-boundary--\r\n"
        #expect(String(decoding: body.data, as: UTF8.self) == expected)
        #expect(body.contentType == "multipart/form-data; boundary=od-boundary")
    }

    @Test func aNewBodyGetsARandomBoundaryAndReadsBackItsParts() {
        var body = MultipartBody()
        #expect(body.boundary.count >= 24)
        #expect(MultipartBody().boundary != body.boundary)
        body.addField(name: "pendingItemId", value: "pend-1")
        body.addFile(name: "file", fileName: "document.jpg", contentType: "image/jpeg", data: DocumentFixtures.jpegWithGPS)
        let parts = MultipartBody.parts(of: body.data, contentType: body.contentType)
        #expect(parts?.count == 2)
        #expect(parts?.first { $0.name == "pendingItemId" }.map { String(decoding: $0.data, as: UTF8.self) } == "pend-1")
        #expect(parts?.first { $0.name == "file" }?.data == DocumentFixtures.jpegWithGPS)
        #expect(parts?.first { $0.name == "file" }?.fileName == "document.jpg")
        #expect(MultipartBody.parts(of: Data("junk".utf8), contentType: "multipart/form-data; boundary=x") == nil)
    }
}

@Suite struct UploadTimeoutTests {
    @Test func tenMegabytesFitOnASlowMobileLinkWithRoomToSpare() {
        // 256 kbit/s: a weak 3G or a congested 4G cell. 10 MB takes about 330 s there.
        let seconds = Double(DocumentRules.maxBytes * 8) / UploadTimeouts.slowLinkBitsPerSecond
        #expect(seconds > 300)
        #expect(UploadTimeouts.total >= seconds * 1.5)
        #expect(UploadTimeouts.total <= 15 * 60)
        // A connection that stops moving is given up long before the total.
        #expect(UploadTimeouts.idle >= 30 && UploadTimeouts.idle <= 120)
    }

    @Test func theUploadSessionUsesThoseLimits() {
        let configuration = URLSessionTransport.uploadConfiguration()
        #expect(configuration.timeoutIntervalForRequest == UploadTimeouts.idle)
        #expect(configuration.timeoutIntervalForResource == UploadTimeouts.total)
        #expect(configuration.urlCache == nil)
        #expect(configuration.httpCookieStorage == nil)
    }
}
