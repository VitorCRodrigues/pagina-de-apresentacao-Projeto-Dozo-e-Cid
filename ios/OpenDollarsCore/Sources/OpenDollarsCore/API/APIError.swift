import Foundation

/// Every error code the UI translates (api-gaps.md, item 3), plus two of the client's own:
/// `network` (no answer at all) and `invalid_response` (an answer that broke the contract).
public enum ClientErrorCode: String, Sendable, Hashable, CaseIterable {
    case validation_failed, quote_expired, below_minimum, account_not_open, account_restricted
    case compliance_hold, market_not_live, idempotency_conflict, not_found, session_expired
    case maintenance, rate_limited, `internal`
    case network, invalid_response
}

/// The UI translates by `code`; `message` is for diagnostics only and is never shown or logged
/// with personal data.
public struct APIError: Error, Sendable, Equatable {
    /// 0 when the request never got an answer.
    public var status: Int
    public var code: ClientErrorCode
    public var message: String
    /// Field name -> reason code ("invalid"), for validation_failed.
    public var fields: [String: String]
    /// maintenance: when the service is expected back.
    public var until: Date?

    public init(status: Int, code: ClientErrorCode, message: String = "", fields: [String: String] = [:], until: Date? = nil) {
        self.status = status
        self.code = code
        self.message = message
        self.fields = fields
        self.until = until
    }

    /// Reads the `{ "error": { code, message, fields?, until? } }` envelope. An unknown code or a
    /// body that is not the envelope (an HTML page from a proxy) becomes `internal`.
    static func from(_ response: HTTPResponse, decoder: JSONDecoder, now: Date) -> APIError {
        guard let body = try? decoder.decode(ApiErrorBody.self, from: response.body) else {
            return APIError(status: response.status, code: .internal, message: "HTTP \(response.status)")
        }
        let code = ApiErrorCode(rawValue: body.error.code).flatMap { ClientErrorCode(rawValue: $0.rawValue) } ?? .internal
        var until = body.error.until
        if code == .maintenance, until == nil, let retryAfter = response.header("Retry-After") {
            until = RetryAfter.date(retryAfter, now: now)
        }
        return APIError(
            status: response.status, code: code, message: body.error.message,
            fields: body.error.fields ?? [:], until: until)
    }
}

/// Retry-After is either delay seconds or an HTTP date (RFC 9110).
enum RetryAfter {
    static func date(_ value: String, now: Date) -> Date? {
        if let seconds = Int(value.trimmingCharacters(in: .whitespaces)), seconds >= 0 {
            return now.addingTimeInterval(TimeInterval(seconds))
        }
        return HTTPDate.parse(value)
    }
}
