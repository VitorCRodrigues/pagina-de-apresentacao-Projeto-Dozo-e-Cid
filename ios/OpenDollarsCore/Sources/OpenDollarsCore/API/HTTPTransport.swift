import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public enum HTTPMethod: String, Sendable, Hashable {
    case GET, POST, PUT, PATCH, DELETE
}

public struct HTTPRequest: Sendable, Equatable {
    public var method: HTTPMethod
    /// Absolute path with query, e.g. "/api/v1/deposits?limit=20".
    public var path: String
    public var headers: [String: String]
    public var body: Data?

    public init(method: HTTPMethod, path: String, headers: [String: String] = [:], body: Data? = nil) {
        self.method = method
        self.path = path
        self.headers = headers
        self.body = body
    }
}

public struct HTTPResponse: Sendable, Equatable {
    public var status: Int
    /// Header names in lower case; read them with `header(_:)`.
    public private(set) var headers: [String: String]
    public var body: Data

    public init(status: Int, headers: [String: String] = [:], body: Data = Data()) {
        self.status = status
        self.headers = Dictionary(headers.map { ($0.key.lowercased(), $0.value) }, uniquingKeysWith: { _, last in last })
        self.body = body
    }

    /// Case-insensitive, as HTTP header names are.
    public func header(_ name: String) -> String? { headers[name.lowercased()] }
}

/// Moves one request over the wire. URLSessionTransport talks to the real API; MockServer
/// answers in memory; tests script replies.
public protocol HTTPTransport: Sendable {
    func send(_ request: HTTPRequest) async throws -> HTTPResponse
    /// Sends a large body (a document), reporting the fraction of it sent (0 to 1), under
    /// UploadTimeouts.
    func upload(_ request: HTTPRequest, progress: @escaping @Sendable (Double) -> Void) async throws -> HTTPResponse
}

extension HTTPTransport {
    /// A transport with nothing to report sends the request whole.
    public func upload(_ request: HTTPRequest, progress: @escaping @Sendable (Double) -> Void) async throws -> HTTPResponse {
        let response = try await send(request)
        progress(1)
        return response
    }
}

/// Time limits for sending a document of up to 10 MB from a phone (T3). Planned for a slow mobile
/// link of 256 kbit/s (a weak 3G or a congested 4G cell), where 10 MB takes about 330 s: the whole
/// upload may take up to 10 minutes, but a connection that moves nothing for 60 s is given up, and
/// the client sees "Reintentar" (TODO(decisão) 34).
public enum UploadTimeouts {
    public static let slowLinkBitsPerSecond: Double = 256_000
    /// Longest wait with no data moving (URLSessionConfiguration.timeoutIntervalForRequest).
    public static let idle: TimeInterval = 60
    /// Longest the whole upload may take (timeoutIntervalForResource).
    public static let total: TimeInterval = 600
}

/// The real network. Ephemeral session: no disk cache and no persisted cookies, so nothing of a
/// session outlives it on disk (CLAUDE.md, session rules).
public final class URLSessionTransport: HTTPTransport, @unchecked Sendable {
    // URLSession is thread-safe; @unchecked because Linux's Foundation does not mark it Sendable.
    private let origin: URL
    private let session: URLSession
    private let uploadSession: URLSession

    public init(origin: URL) {
        self.origin = origin
        self.session = URLSession(configuration: Self.ephemeral())
        self.uploadSession = URLSession(configuration: Self.uploadConfiguration())
    }

    private static func ephemeral() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        return configuration
    }

    /// The documents' session: the same privacy as the API's, with UploadTimeouts.
    static func uploadConfiguration() -> URLSessionConfiguration {
        let configuration = ephemeral()
        configuration.timeoutIntervalForRequest = UploadTimeouts.idle
        configuration.timeoutIntervalForResource = UploadTimeouts.total
        return configuration
    }

    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        let (data, response) = try await session.data(for: try urlRequest(request))
        return try Self.response(data, response)
    }

    public func upload(_ request: HTTPRequest, progress: @escaping @Sendable (Double) -> Void) async throws -> HTTPResponse {
        var urlRequest = try urlRequest(request)
        let body = urlRequest.httpBody ?? Data()
        urlRequest.httpBody = nil
        #if canImport(FoundationNetworking)
        // Linux has no per-task delegate: no progress, the same limits.
        urlRequest.httpBody = body
        let (data, response) = try await uploadSession.data(for: urlRequest)
        progress(1)
        #else
        let (data, response) = try await uploadSession.upload(for: urlRequest, from: body, delegate: UploadProgress(progress))
        #endif
        return try Self.response(data, response)
    }

    private func urlRequest(_ request: HTTPRequest) throws -> URLRequest {
        guard let url = URL(string: request.path, relativeTo: origin) else { throw URLError(.badURL) }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method.rawValue
        for (name, value) in request.headers { urlRequest.setValue(value, forHTTPHeaderField: name) }
        urlRequest.httpBody = request.body
        return urlRequest
    }

    private static func response(_ data: Data, _ response: URLResponse) throws -> HTTPResponse {
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        var headers: [String: String] = [:]
        for (name, value) in http.allHeaderFields {
            if let name = name as? String, let value = value as? String { headers[name] = value }
        }
        return HTTPResponse(status: http.statusCode, headers: headers, body: data)
    }
}

#if !canImport(FoundationNetworking)
/// Reports the bytes sent of one upload.
private final class UploadProgress: NSObject, URLSessionTaskDelegate, Sendable {
    private let report: @Sendable (Double) -> Void

    init(_ report: @escaping @Sendable (Double) -> Void) { self.report = report }

    func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64, totalBytesSent: Int64, totalBytesExpectedToSend: Int64) {
        guard totalBytesExpectedToSend > 0 else { return }
        report(min(1, Double(totalBytesSent) / Double(totalBytesExpectedToSend)))
    }
}
#endif
