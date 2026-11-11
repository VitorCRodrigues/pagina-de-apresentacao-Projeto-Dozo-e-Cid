#if canImport(Security)
import Foundation
import Security

/// The refresh token in the Keychain: a generic password readable only while the device is
/// unlocked and never migrated to another device or backup (kSecAttrAccessibleWhenUnlockedThisDeviceOnly),
/// never synced to iCloud Keychain. Compiled on Apple platforms only; Linux and Windows test the
/// session against an in-memory store.
public struct KeychainRefreshTokenStore: RefreshTokenStore {
    private let service: String
    private let account = "refresh-token"

    public init(service: String = "com.opendollars.session") {
        self.service = service
    }

    public enum KeychainError: Error, Equatable {
        case status(OSStatus)
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any,
        ]
    }

    public func load() throws -> StoredSession? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw KeychainError.status(status) }
        return try JSONCoding.makeDecoder().decode(StoredSession.self, from: data)
    }

    public func save(_ session: StoredSession) throws {
        let data = try JSONCoding.makeEncoder().encode(session)
        try delete()
        var attributes = baseQuery
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.status(status) }
    }

    public func delete() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw KeychainError.status(status) }
    }
}
#endif
