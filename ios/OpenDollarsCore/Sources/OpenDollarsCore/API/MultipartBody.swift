import Foundation

/// multipart/form-data (RFC 7578), for POST /account/documents: `pendingItemId` and `file`
/// (api-gaps.md). Built in memory: a document is at most 10 MB.
public struct MultipartBody: Sendable {
    public let boundary: String
    private var parts = Data()

    public init(boundary: String = "od-" + UUID().uuidString.lowercased()) {
        self.boundary = boundary
    }

    public var contentType: String { "multipart/form-data; boundary=\(boundary)" }

    public var data: Data {
        var result = parts
        result.append(Data("--\(boundary)--\r\n".utf8))
        return result
    }

    public mutating func addField(name: String, value: String) {
        parts.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".utf8))
    }

    public mutating func addFile(name: String, fileName: String, contentType: String, data: Data) {
        parts.append(Data(
            "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"; filename=\"\(fileName)\"\r\nContent-Type: \(contentType)\r\n\r\n".utf8))
        parts.append(data)
        parts.append(Data("\r\n".utf8))
    }

    // MARK: Reading (the mock server and the tests)

    public struct Part: Sendable, Equatable {
        public var name: String
        public var fileName: String?
        public var contentType: String?
        public var data: Data
    }

    /// The parts of a body, or nil when it is not well formed.
    public static func parts(of body: Data, contentType: String) -> [Part]? {
        guard let boundary = contentType.components(separatedBy: "boundary=").dropFirst().first?
            .trimmingCharacters(in: CharacterSet(charactersIn: "\" ")), !boundary.isEmpty
        else { return nil }
        let delimiter = Data("--\(boundary)".utf8)
        let headerEnd = Data("\r\n\r\n".utf8)
        guard var cursor = body.range(of: delimiter)?.upperBound else { return nil }
        var result: [Part] = []
        while true {
            // "--" after the delimiter closes the body.
            if body[cursor...].starts(with: Data("--".utf8)) { return result }
            guard body[cursor...].starts(with: Data("\r\n".utf8)) else { return nil }
            let start = cursor + 2
            guard let headersRange = body.range(of: headerEnd, in: start..<body.endIndex),
                  let next = body.range(of: delimiter, in: headersRange.upperBound..<body.endIndex)
            else { return nil }
            let headers = String(decoding: body[start..<headersRange.lowerBound], as: UTF8.self)
            var content = body[headersRange.upperBound..<next.lowerBound]
            if content.suffix(2) == Data("\r\n".utf8) { content = content.dropLast(2) }
            guard let part = part(headers: headers, data: Data(content)) else { return nil }
            result.append(part)
            cursor = next.upperBound
        }
    }

    private static func part(headers: String, data: Data) -> Part? {
        var name: String?
        var fileName: String?
        var type: String?
        for line in headers.components(separatedBy: "\r\n") {
            let lower = line.lowercased()
            if lower.hasPrefix("content-disposition:") {
                name = quoted("name", in: line)
                fileName = quoted("filename", in: line)
            } else if lower.hasPrefix("content-type:") {
                type = line.dropFirst("content-type:".count).trimmingCharacters(in: .whitespaces)
            }
        }
        guard let name else { return nil }
        return Part(name: name, fileName: fileName, contentType: type, data: data)
    }

    private static func quoted(_ key: String, in line: String) -> String? {
        for piece in line.components(separatedBy: ";") {
            let trimmed = piece.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("\(key)=\"") else { continue }
            return String(trimmed.dropFirst(key.count + 2).dropLast())
        }
        return nil
    }
}
