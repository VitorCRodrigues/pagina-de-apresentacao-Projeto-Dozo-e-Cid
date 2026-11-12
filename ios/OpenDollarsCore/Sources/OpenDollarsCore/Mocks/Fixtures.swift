// Mocks exist only in DEBUG builds (TODO(fase 11)): a Release build has no simulated provider
// or in-memory API, and the app refuses to build without the real ones (AppModel.live).
#if DEBUG

import Foundation

// Sample data for the mock, the same as web/src/mocks/fixtures.ts. Fictitious people; real
// UCITS ETFs with made-up quantities. None of it is a product decision (api-gaps.md, item 10).

/// Editorial text the API sends already translated (decision 12); the mock keeps every language.
struct Localized: Sendable, Equatable {
    let es: String
    let pt: String
    let en: String

    subscript(locale: AppLocale) -> String {
        switch locale {
        case .es: es
        case .pt: pt
        case .en: en
        }
    }
}

enum Fixtures {
    static let config = AppConfig(
        liveMarkets: [.AR],
        minRecurringUsdCents: Money(cents: 25000),
        // TODO(decisão): one-off minimum still "a confirmar" in the PRD; mock value of api-gaps.md, item 9.
        minDepositUsdCents: Money(cents: 10000),
        efxCapUsdCents: Money(cents: 1_000_000),
        railsByCountry: [.AR: [.ar_usdc, .ar_swift], .BR: [.br_efx, .br_fxbank]],
        investmentWindowDay: 5,
        ibkrPortalUrl: "https://www.interactivebrokers.com/sso/Login")

    static let lucia = Me(
        id: "usr_7f3a9c", name: "Lucía Fernández", email: "lucia.fernandez@example.com",
        country: .AR, locale: .es, accountStatus: .open)

    static let rafael = Me(
        id: "usr_2b81d4", name: "Rafael Souza", email: "rafael.souza@example.com",
        country: .BR, locale: .pt, accountStatus: .draft)

    struct ETF: Sendable {
        let isin: String
        let name: String
        let shares: Int
        let price: Money
        let targetWeight: Double
        let description: Localized
    }

    static let etfs: [ETF] = [
        ETF(
            isin: "IE00B5BMR087", name: "iShares Core S&P 500 UCITS ETF (Acc)", shares: 14,
            price: Money(cents: 64210), targetWeight: 0.6,
            description: Localized(
                es: "Sigue al S&P 500: las 500 mayores empresas de EE. UU. Reinvierte los dividendos.",
                pt: "Acompanha o S&P 500: as 500 maiores empresas dos EUA. Reinveste os dividendos.",
                en: "Tracks the S&P 500, the 500 largest US companies. Reinvests dividends.")),
        ETF(
            isin: "IE00BK5BQT80", name: "Vanguard FTSE All-World UCITS ETF (Acc)", shares: 39,
            price: Money(cents: 13895), targetWeight: 0.3,
            description: Localized(
                es: "Miles de empresas de mercados desarrollados y emergentes. Reinvierte los dividendos.",
                pt: "Milhares de empresas de mercados desenvolvidos e emergentes. Reinveste os dividendos.",
                en: "Thousands of companies across developed and emerging markets. Reinvests dividends.")),
        ETF(
            isin: "IE00B4L5Y983", name: "iShares Core MSCI World UCITS ETF (Acc)", shares: 15,
            price: Money(cents: 10822), targetWeight: 0.1,
            description: Localized(
                es: "Grandes y medianas empresas de 23 países desarrollados. Reinvierte los dividendos.",
                pt: "Empresas grandes e médias de 23 países desenvolvidos. Reinveste os dividendos.",
                en: "Large and mid-size companies in 23 developed countries. Reinvests dividends.")),
    ]

    struct DocumentRequest: Sendable {
        let id: String
        let title: Localized
        let description: Localized
    }

    static let documentRequests: [DocumentRequest] = [
        DocumentRequest(
            id: "pend-address-proof",
            title: Localized(es: "Comprobante de domicilio", pt: "Comprovante de endereço", en: "Proof of address"),
            description: Localized(
                es: "Interactive Brokers pide una factura de servicios de los últimos 3 meses.",
                pt: "A Interactive Brokers pede uma conta de consumo dos últimos 3 meses.",
                en: "Interactive Brokers asks for a utility bill from the last 3 months.")),
        DocumentRequest(
            id: "pend-dni-back",
            title: Localized(es: "Foto del dorso del DNI", pt: "Foto do verso do DNI", en: "Photo of the back of your DNI"),
            description: Localized(
                es: "La foto anterior no se leía bien. Sacala con buena luz y sin reflejos.",
                pt: "A foto anterior estava ilegível. Tire com boa luz e sem reflexos.",
                en: "The previous photo was not readable. Take it in good light, without glare.")),
    ]

    static let depositAction = (
        title: Localized(
            es: "Enviá el dinero de tu aporte", pt: "Envie o dinheiro do seu aporte",
            en: "Send the money for your deposit"),
        description: Localized(
            es: "Seguí las instrucciones de depósito para completar el aporte.",
            pt: "Siga as instruções de depósito para concluir o aporte.",
            en: "Follow the deposit instructions to complete it."))

    static let returnReasonThirdParty = Localized(
        es: "La transferencia salió de una cuenta que no está a tu nombre. El socio de cambio licenciado devuelve el dinero a la cuenta de origen.",
        pt: "A transferência saiu de uma conta que não está no seu nome. O parceiro de câmbio licenciado devolve o dinheiro à conta de origem.",
        en: "The transfer came from an account that is not in your name. The licensed exchange partner returns the money to the source account.")

    static func usdcInstructions() -> DepositInstructions {
        .usdc(UsdcInstructions(
            token: "USDC", network: "Ethereum (ERC-20)",
            address: "0x52908400098527886E0F7030069857D2E4169EE7", memo: nil, scope: .account))
    }

    static func wireInstructions(reference: String) -> DepositInstructions {
        .wire(WireInstructions(
            beneficiaryName: "Lucía Fernández", accountNumber: "U****4821",
            bankName: "Citibank N.A., New York", swiftBic: "CITIUS33", reference: reference, scope: .deposit))
    }
}

#endif
