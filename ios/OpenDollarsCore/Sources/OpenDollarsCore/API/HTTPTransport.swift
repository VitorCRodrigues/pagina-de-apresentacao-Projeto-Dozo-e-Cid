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
}

/// The real network. Ephemeral session: no disk cache and no persisted cookies, so nothing of a
/// session outlives it on disk (CLAUDE.md, session rules).
public final class URLSessionTransport: HTTPTransport, @unchecked Sendable {
    // URLSession is thread-safe; @unchecked because Linux's Foundation does not mark it Sendable.
    private let origin: URL
    private let session: URLSession

    public init(origin: URL) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        self.origin = origin
        self.session = URLSession(configuration: configuration)
    }

    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        guard let url = URL(string: request.path, relativeTo: origin) else { throw URLError(.badURL) }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method.rawValue
        for (name, value) in request.headers { urlRequest.setValue(value, forHTTPHeaderField: name) }
        urlRequest.httpBody = request.body

        let (data, response) = try await session.data(for: urlRequest)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        var headers: [String: String] = [:]
        for (name, value) in http.allHeaderFields {
            if let name = name as? String, let value = value as? String { headers[name] = value }
        }
        return HTTPResponse(status: http.statusCode, headers: headers, body: data)
    }
}
