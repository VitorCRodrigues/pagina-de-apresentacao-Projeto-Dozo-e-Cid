import Foundation

/// A file the client chose for one pending document, ready to send: metadata removed, then
/// checked against the limits. It lives in memory only and goes away with the session.
public struct PreparedDocument: Sendable, Equatable, Identifiable {
    public let id: UUID
    /// What is sent: the chosen bytes without metadata.
    public let data: Data
    public let type: DocumentType
    /// Shown on the row only (the file's name, or "Documento escaneado"); never sent.
    public let displayName: String

    public var byteCount: Int { data.count }

    /// One key per document chosen: Reintentar resends the same one, a new file gets a new one
    /// (TODO(api) 2: the backend should honour it on POST /account/documents).
    public var idempotencyKey: IdempotencyKey { IdempotencyKey(rawValue: id.uuidString.lowercased()) }

    /// Removes metadata first, so the limit is checked on what is really sent.
    public static func prepare(_ data: Data, displayName: String) -> Result<PreparedDocument, DocumentProblem> {
        if data.isEmpty { return .failure(.empty) }
        guard let type = DocumentType.sniff(data) else { return .failure(.wrongType) }
        guard let cleaned = try? ImageMetadata.stripped(data) else { return .failure(.wrongType) }
        if let problem = DocumentRules.problem(cleaned) { return .failure(problem) }
        return .success(PreparedDocument(id: UUID(), data: cleaned, type: type, displayName: displayName))
    }
}
