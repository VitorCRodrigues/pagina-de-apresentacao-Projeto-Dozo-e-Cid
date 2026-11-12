#if DEBUG
import ImageIO
import OpenDollarsCore
import SwiftUI
import UniformTypeIdentifiers

/// UI tests only (DEBUG): `-documentFixture <name>` makes "Elegir de Archivos" hand over a file
/// made here instead of opening the Files app, which the simulator cannot fill reliably. Everything
/// after the picker is the real path: shrinking, metadata removal, limits, progress, sending.
/// - photo: a 4032x3024 JPEG with a GPS position and the phone's make, as a phone takes it.
/// - pdf: a one-page PDF.
/// - tooBig: a PDF over 10 MB, refused before sending.
enum DocumentFixtures {
    struct Fixture: Sendable {
        let name: String
        let data: Data
    }

    static func fromLaunchArguments() -> Fixture? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-documentFixture"), index + 1 < arguments.count else { return nil }
        switch arguments[index + 1] {
        case "photo": return photoWithLocation().map { Fixture(name: "IMG_0042.JPG", data: $0) }
        case "pdf": return Fixture(name: "factura-luz.pdf", data: onePagePDF())
        case "tooBig":
            var data = Data("%PDF-1.4\n".utf8)
            data.append(Data(count: DocumentRules.maxBytes + 1024))
            return Fixture(name: "escaneo-grande.pdf", data: data)
        default: return nil
        }
    }

    /// A page-like picture: a cream sheet with navy lines, then EXIF with a position.
    private static func photoWithLocation() -> Data? {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let size = CGSize(width: 4032, height: 3024)
        let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
            ODColor.cream50.uiColor.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            ODColor.navy900.uiColor.setFill()
            for line in 0..<12 {
                context.fill(CGRect(x: 400, y: 400 + line * 180, width: line % 3 == 0 ? 2400 : 3200, height: 40))
            }
        }
        guard let cgImage = image.cgImage else { return nil }
        let output = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(output, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
        let metadata: [CFString: Any] = [
            kCGImagePropertyGPSDictionary: [
                kCGImagePropertyGPSLatitude: 34.6037, kCGImagePropertyGPSLatitudeRef: "S",
                kCGImagePropertyGPSLongitude: 58.3816, kCGImagePropertyGPSLongitudeRef: "W",
            ],
            kCGImagePropertyTIFFDictionary: [kCGImagePropertyTIFFMake: "SampleMaker", kCGImagePropertyTIFFModel: "SamplePhone"],
            kCGImageDestinationLossyCompressionQuality: 0.95,
        ]
        CGImageDestinationAddImage(destination, cgImage, metadata as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { return nil }
        return output as Data
    }

    private static func onePagePDF() -> Data {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        return UIGraphicsPDFRenderer(bounds: page).pdfData { context in
            context.beginPage()
            ODColor.navy900.uiColor.setFill()
            for line in 0..<10 {
                context.fill(CGRect(x: 60, y: 80 + line * 40, width: line % 3 == 0 ? 300 : 460, height: 8))
            }
        }
    }
}
#endif
