import AVFoundation
import ImageIO
import OpenDollarsCore
import SwiftUI
import UniformTypeIdentifiers
import VisionKit

/// Where a document's bytes come from, before the core takes over (DocumentUploads removes
/// metadata, checks the limits and sends). Every photo, from the scanner, the Photos library or
/// Files, is shrunk to DocumentImagePolicy (about 3000 px on the longer side, compressed JPEG)
/// with its orientation applied, so a normal phone photo is never refused for size
/// (TODO(decisão) 32). Nothing is written to disk.
enum DocumentFiles {
    /// A photo in any format ImageIO reads (HEIC, JPEG, PNG): shrunk, turned upright, re-encoded
    /// as JPEG. nil when it cannot be read.
    static func shrunkPhoto(_ data: Data) -> Data? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int
        else { return nil }
        let target = DocumentImagePolicy.targetSize(width: width, height: height)
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            // Applies the EXIF orientation to the pixels, since the EXIF itself is removed.
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: max(target.width, target.height),
            kCGImageSourceShouldCacheImmediately: true,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        return jpeg(image)
    }

    /// A scanned page (already upright): shrunk and encoded as JPEG.
    @MainActor
    static func shrunkPage(_ page: UIImage) -> Data? {
        let pixels = PixelSize(width: Int(page.size.width * page.scale), height: Int(page.size.height * page.scale))
        let target = DocumentImagePolicy.targetSize(width: pixels.width, height: pixels.height)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: CGSize(width: target.width, height: target.height), format: format).image { _ in
            page.draw(in: CGRect(x: 0, y: 0, width: target.width, height: target.height))
        }
        return resized.cgImage.flatMap(jpeg)
    }

    /// JPEG at the policy's quality, with no metadata given to the encoder.
    static func jpeg(_ image: CGImage) -> Data? {
        let output = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(output, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: DocumentImagePolicy.jpegQuality] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { return nil }
        return output as Data
    }

    /// One PDF from the scanned pages, each page the JPEG itself (passed through, not re-encoded),
    /// at 200 dpi. Always a PDF, one page or many (TODO(decisão) 36).
    static func pdf(fromJPEGPages pages: [Data]) -> Data? {
        let output = NSMutableData()
        guard let consumer = CGDataConsumer(data: output) else { return nil }
        var box = CGRect.zero
        guard let context = CGContext(consumer: consumer, mediaBox: &box, nil) else { return nil }
        for page in pages {
            guard let provider = CGDataProvider(data: page as CFData),
                  let image = CGImage(jpegDataProviderSource: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
            else { return nil }
            var media = CGRect(x: 0, y: 0, width: CGFloat(image.width) * 72 / 200, height: CGFloat(image.height) * 72 / 200)
            context.beginPage(mediaBox: &media)
            context.draw(image, in: media)
            context.endPage()
        }
        context.closePDF()
        return output as Data
    }

    /// A file from the Files app: read in memory (no copy on disk); a photo is shrunk like any
    /// other, a PDF goes as it is.
    static func read(_ url: URL) -> Data? {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { return nil }
        return fromFile(data)
    }

    static func fromFile(_ data: Data) -> Data? {
        DocumentType.sniff(data)?.isImage == true ? shrunkPhoto(data) : data
    }
}

/// The system's document scanner (VisionKit): edges found, perspective corrected, one or more
/// pages. Hands back each page as a shrunk JPEG; an empty list when the client cancelled.
struct DocumentScanner: UIViewControllerRepresentable {
    let onFinish: @MainActor ([Data]) -> Void

    /// No camera, no scanner: the simulator, for one (UI tests use Files instead).
    static var isAvailable: Bool { VNDocumentCameraViewController.isSupported }

    /// The camera prompt the first time (NSCameraUsageDescription, from InfoPlist.xcstrings);
    /// false after a refusal, so the row explains how to allow it in Settings.
    static func cameraAllowed() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: true
        case .notDetermined: await AVCaptureDevice.requestAccess(for: .video)
        default: false
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let controller = VNDocumentCameraViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: VNDocumentCameraViewController, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, @preconcurrency VNDocumentCameraViewControllerDelegate {
        private let onFinish: @MainActor ([Data]) -> Void

        init(onFinish: @escaping @MainActor ([Data]) -> Void) { self.onFinish = onFinish }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            onFinish((0..<scan.pageCount).compactMap { DocumentFiles.shrunkPage(scan.imageOfPage(at: $0)) })
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            onFinish([])
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: any Error) {
            onFinish([])
        }
    }
}
