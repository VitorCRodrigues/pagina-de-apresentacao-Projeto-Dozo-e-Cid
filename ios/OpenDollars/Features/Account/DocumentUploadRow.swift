import OpenDollarsCore
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// One document Interactive Brokers asked for (web: DocumentUpload.tsx): scan it, or pick a photo
/// or a file; see it; send it, with a progress bar. A statement line like the rest of the screen.
/// The file's bytes go to the core (DocumentUploads), which removes metadata, checks the limits
/// and sends; this view only gets the bytes, shrinking photos first (DocumentFiles).
struct DocumentUploadRow: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    let item: PendingItem

    @State private var scanning = false
    @State private var importing = false
    @State private var photo: PhotosPickerItem?
    @State private var preparing = false
    @State private var cameraDenied = false
    @State private var unreadable = false

    private var uploads: DocumentUploads { model.session.documents }
    private var state: DocumentUploads.State? { uploads.state(of: item.id) }

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space3) {
            VStack(alignment: .leading, spacing: ODMetric.space1) {
                Text(item.title).odText(.label).foregroundStyle(ODColor.graphite900)
                Text(item.description).odText(.caption).foregroundStyle(ODColor.gray600)
            }
            .accessibilityElement(children: .combine)

            if let document { ChosenFile(document: document) }

            if case .sending(_, let progress)? = state {
                UploadProgressBar(fraction: progress)
                    .accessibilityIdentifier("upload.progress.\(item.id)")
            }

            problem

            actions

            if document == nil {
                Text(Strings.accountUploadAccepted).odText(.caption).foregroundStyle(ODColor.gray600)
            }
        }
        .padding(.vertical, ODMetric.space2)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("upload.row.\(item.id)")
        .sheet(isPresented: $scanning) {
            // The scanner hands over each page already shrunk to JPEG (always one PDF, TODO(decisão) 36).
            DocumentScanner { pages in
                scanning = false
                guard !pages.isEmpty else { return }
                prepare(name: Strings.iosUploadScannedName) { DocumentFiles.pdf(fromJPEGPages: pages) }
            }
            .ignoresSafeArea()
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.jpeg, .png, .pdf]) { result in
            guard case .success(let url) = result else { return }
            prepare(name: url.lastPathComponent) { DocumentFiles.read(url) }
        }
        .onChange(of: photo) { _, picked in
            guard let picked else { return }
            photo = nil
            preparing = true
            Task {
                // HEIC or JPEG from the library: shrunk and re-encoded as JPEG (DocumentImagePolicy).
                let original = try? await picked.loadTransferable(type: Data.self)
                prepare(name: Strings.iosUploadPhotoName) { original.flatMap(DocumentFiles.shrunkPhoto) }
            }
        }
    }

    private var document: PreparedDocument? {
        switch state {
        case .chosen(let document)?, .sending(let document, _)?, .failed(let document, _)?: document
        default: nil
        }
    }

    private var isSending: Bool {
        if case .sending? = state { true } else { false }
    }

    @ViewBuilder
    private var problem: some View {
        if cameraDenied {
            Notice(tone: .warning, title: Strings.iosUploadCameraDenied) {
                Button(Strings.iosUploadOpenSettings) {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
                .buttonStyle(.odGhost)
            }
        } else if unreadable {
            Notice(tone: .error, title: Strings.accountUploadWrongType)
                .accessibilityIdentifier("upload.problem.\(item.id)")
        } else if case .rejected(let refused)? = state {
            Notice(tone: .error, title: L10n.text(refused.copyKey))
                .accessibilityIdentifier("upload.problem.\(item.id)")
        } else if case .failed(_, let error)? = state {
            // A dropped or timed-out connection says so; the file stays for Reintentar.
            Notice(tone: .error, title: error.code == .network ? Strings.iosUploadInterrupted : L10n.text(error.code.copyKey))
                .accessibilityIdentifier("upload.problem.\(item.id)")
        }
    }

    @ViewBuilder
    private var actions: some View {
        VStack(alignment: .leading, spacing: ODMetric.space2) {
            if let document {
                let failed: Bool = { if case .failed? = state { true } else { false } }()
                Button(failed ? Strings.commonRetry : Strings.accountUploadSend) {
                    Task { await uploads.send(item.id) }
                }
                .odButtonStyle(.secondary, loading: isSending)
                .accessibilityIdentifier(failed ? "upload.retry.\(item.id)" : "upload.send.\(item.id)")
                .accessibilityHint(document.displayName)
            }
            if !isSending {
                FlowLayout {
                    if DocumentScanner.isAvailable {
                        Button(Strings.iosUploadScan) { Task { await scan() } }
                            .buttonStyle(.odGhost)
                            .accessibilityIdentifier("upload.scan.\(item.id)")
                    }
                    Menu {
                        PhotosPicker(selection: $photo, matching: .images, photoLibrary: .shared()) {
                            Text(Strings.iosUploadFromPhotos)
                        }
                        .accessibilityIdentifier("upload.fromPhotos")
                        Button(Strings.iosUploadFromFiles) { chooseFile() }
                            .accessibilityIdentifier("upload.fromFiles")
                    } label: {
                        // Drawn as the ghost button: a Menu does not reliably take a ButtonStyle.
                        Text(document == nil ? Strings.accountUploadChoose : Strings.accountUploadChange)
                            .odText(.label)
                            .underline(color: ODColor.green700)
                            .foregroundStyle(ODColor.green700)
                            .padding(.horizontal, ODMetric.space1)
                            .frame(minHeight: ODMetric.minTapTarget)
                            .contentShape(Rectangle())
                    }
                    .accessibilityIdentifier("upload.choose.\(item.id)")
                }
                .disabled(preparing)
            }
        }
    }

    /// Asks for the camera the first time; after a refusal, says how to allow it.
    private func scan() async {
        cameraDenied = false
        if await DocumentScanner.cameraAllowed() { scanning = true } else { cameraDenied = true }
    }

    private func chooseFile() {
        #if DEBUG
        // UI tests: the simulator's Files app cannot be filled reliably, so `-documentFixture
        // <name>` hands over a file made in the app; everything after the picker is the real path.
        if let fixture = DocumentFixtures.fromLaunchArguments() {
            prepare(name: fixture.name) { DocumentFiles.fromFile(fixture.data) }
            return
        }
        #endif
        importing = true
    }

    /// Reads and shrinks off the main thread, then hands the bytes to the core.
    private func prepare(name: String, _ load: @escaping @Sendable () async -> Data?) {
        cameraDenied = false
        unreadable = false
        preparing = true
        Task {
            let data = await Task.detached(priority: .userInitiated) { await load() }.value
            preparing = false
            guard let data else {
                unreadable = true
                return
            }
            uploads.choose(data, displayName: name, for: item.id)
        }
    }
}

/// The chosen file: a thumbnail for a photo, an icon for a PDF; its name and size.
private struct ChosenFile: View {
    let document: PreparedDocument

    var body: some View {
        HStack(spacing: ODMetric.space3) {
            if document.type.isImage, let image = UIImage(data: document.data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: ODMetric.radiusControl))
                    .overlay(RoundedRectangle(cornerRadius: ODMetric.radiusControl).strokeBorder(ODColor.gray200, lineWidth: ODMetric.hairline))
                    .accessibilityLabel(Strings.accountUploadPreview(name: document.displayName))
            } else {
                Image(systemName: "doc.text")
                    .font(.title3)
                    .foregroundStyle(ODColor.gray600)
                    .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(document.displayName)
                    .odText(.body)
                    .foregroundStyle(ODColor.graphite900)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(FileSizeFormatter.format(bytes: document.byteCount, locale: L10n.locale))
                    .odText(.valueCaption)
                    .foregroundStyle(ODColor.gray600)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("upload.file")
    }
}

/// A thin bar, as in the web's stepper; VoiceOver reads "Enviando el documento, 40 %".
struct UploadProgressBar: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let fraction: Double

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(ODColor.gray200)
                Capsule().fill(ODColor.navy900).frame(width: proxy.size.width * min(max(fraction, 0), 1))
            }
        }
        .frame(height: 4)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: fraction)
        .accessibilityElement()
        .accessibilityLabel(Strings.accountUploadProgress)
        .accessibilityValue(Text(Double(fraction), format: .percent.precision(.fractionLength(0))))
    }
}

/// The ghost actions side by side, wrapping onto a second line when Dynamic Type needs it.
private struct FlowLayout<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: ODMetric.space5) { content }
            VStack(alignment: .leading, spacing: ODMetric.space1) { content }
        }
    }
}
