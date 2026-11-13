import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// What the client needs from the session. The session manager implements it; tests fake it.
public protocol SessionTokens: Sendable {
    /// The access token, kept in memory only; nil when signed out.
    func accessToken() async -> String?
    /// A silent refresh with the refresh token. true when a new access token is in place.
    func refreshAccessToken() async -> Bool
    /// The API said the session is over and it could not be renewed: clear everything.
    func sessionDidExpire() async
}

/// The OpenDollars API (PRD section 8 and api-gaps.md). Every call goes through here:
/// base /api/v1, JSON, Accept-Language on every request, bearer token, Idempotency-Key on
/// creations, errors translated by code, one silent refresh on 401 session_expired.
public actor APIClient {
    private let transport: any HTTPTransport
    private let tokens: any SessionTokens
    private let locale: @Sendable () -> AppLocale
    private let now: @Sendable () -> Date
    private let decoder = JSONCoding.makeDecoder()
    private let encoder = JSONCoding.makeEncoder()

    /// Seconds to add to the device clock to get the server's, from the latest Date header.
    public private(set) var clockOffset: TimeInterval = 0

    public init(
        transport: any HTTPTransport,
        tokens: any SessionTokens,
        locale: @escaping @Sendable () -> AppLocale,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.transport = transport
        self.tokens = tokens
        self.locale = locale
        self.now = now
    }

    /// The device clock corrected by the server's (quote countdown).
    public func serverNow() -> Date { now().addingTimeInterval(clockOffset) }

    // MARK: Core

    func request<Response: Decodable>(
        _ method: HTTPMethod, _ path: String, query: [(String, String)] = [],
        body: (some Encodable & Sendable)? = Optional<Never>.none, idempotencyKey: IdempotencyKey? = nil,
        as type: Response.Type = Response.self
    ) async throws -> Response {
        let response = try await send(method, path, query: query, body: body, idempotencyKey: idempotencyKey)
        do {
            return try decoder.decode(Response.self, from: response.body)
        } catch {
            // Paths only, never values: responses carry personal data.
            throw APIError(status: response.status, code: .invalid_response, message: "Invalid response for \(path)")
        }
    }

    func requestNoContent(
        _ method: HTTPMethod, _ path: String,
        body: (some Encodable & Sendable)? = Optional<Never>.none, idempotencyKey: IdempotencyKey? = nil
    ) async throws {
        _ = try await send(method, path, query: [], body: body, idempotencyKey: idempotencyKey)
    }

    private func send(
        _ method: HTTPMethod, _ path: String, query: [(String, String)],
        body: (some Encodable & Sendable)?, idempotencyKey: IdempotencyKey?
    ) async throws -> HTTPResponse {
        let bodyData: Data? = try body.map { try encoder.encode($0) }
        return try await perform(
            method, path, query: query, body: bodyData.map { ($0, "application/json") },
            idempotencyKey: idempotencyKey, progress: nil)
    }

    /// A multipart upload (POST /account/documents), with the fraction sent reported. A retry
    /// after a renewed token sends the same body with the same Idempotency-Key.
    func upload<Response: Decodable>(
        _ path: String, body: MultipartBody, idempotencyKey: IdempotencyKey,
        progress: @escaping @Sendable (Double) -> Void, as type: Response.Type = Response.self
    ) async throws -> Response {
        let response = try await perform(
            .POST, path, query: [], body: (body.data, body.contentType), idempotencyKey: idempotencyKey, progress: progress)
        do {
            return try decoder.decode(Response.self, from: response.body)
        } catch {
            throw APIError(status: response.status, code: .invalid_response, message: "Invalid response for \(path)")
        }
    }

    private func perform(
        _ method: HTTPMethod, _ path: String, query: [(String, String)],
        body: (data: Data, contentType: String)?, idempotencyKey: IdempotencyKey?,
        progress: (@Sendable (Double) -> Void)?
    ) async throws -> HTTPResponse {
        let fullPath = OpenDollarsCore.apiBasePath + path + Self.queryString(query)
        var refreshed = false

        while true {
            var headers = ["Accept": "application/json", "Accept-Language": locale().rawValue]
            if let token = await tokens.accessToken() { headers["Authorization"] = "Bearer \(token)" }
            if let idempotencyKey { headers["Idempotency-Key"] = idempotencyKey.rawValue }
            if let body { headers["Content-Type"] = body.contentType }

            let request = HTTPRequest(method: method, path: fullPath, headers: headers, body: body?.data)
            let response: HTTPResponse
            do {
                if let progress {
                    response = try await transport.upload(request, progress: progress)
                } else {
                    response = try await transport.send(request)
                }
            } catch is CancellationError {
                throw CancellationError()
            } catch let error as URLError where error.code == .cancelled {
                throw CancellationError()
            } catch {
                throw APIError(status: 0, code: .network, message: "Network request failed")
            }

            if let date = response.header("Date") {
                clockOffset = ClockOffset.offset(dateHeader: date, receivedAt: now())
            }
            if (200..<300).contains(response.status) { return response }

            let error = APIError.from(response, decoder: decoder, now: now())
            if error.code == .session_expired {
                // One silent refresh per request; the retry keeps the same Idempotency-Key.
                if !refreshed, await tokens.refreshAccessToken() {
                    // Cancelled meanwhile (the client left): the renewed token may already be
                    // the next client's, so nothing is sent again.
                    try Task.checkCancellation()
                    refreshed = true
                    continue
                }
                await tokens.sessionDidExpire()
            }
            throw error
        }
    }

    // MARK: Encoding helpers

    /// Unreserved characters plus the comma, which separates a list of states.
    private static let allowedInQuery: Set<Character> = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~,")
    private static let allowedInSegment: Set<Character> = Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")

    static func percentEncode(_ text: String, allowed: Set<Character>) -> String {
        var result = ""
        for character in text {
            if allowed.contains(character) {
                result.append(character)
            } else {
                for byte in String(character).utf8 { result += String(format: "%%%02X", byte) }
            }
        }
        return result
    }

    static func queryString(_ items: [(String, String)]) -> String {
        guard !items.isEmpty else { return "" }
        return "?" + items.map { "\($0.0)=\(percentEncode($0.1, allowed: allowedInQuery))" }.joined(separator: "&")
    }

    /// An identifier inside a path ("/deposits/{id}"), escaped so it stays one segment.
    static func segment(_ id: String) -> String {
        percentEncode(id, allowed: allowedInSegment)
    }
}
