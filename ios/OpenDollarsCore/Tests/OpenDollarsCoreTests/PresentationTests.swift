import Testing
@testable import OpenDollarsCore

// Port of web/src/features/session/account-routing.ts and features/account/account-timeline.ts.

@Suite struct LandingTests {
    // Decision 14: a restricted account keeps the navigation; deposits are blocked inside.
    @Test func anOpenedAccountLandsOnTheTabs() {
        #expect(Landing.for(.open) == .tabs)
        #expect(Landing.for(.restricted) == .tabs)
    }

    @Test func aDraftLandsOnTheOnboarding() {
        #expect(Landing.for(.draft) == .onboarding)
    }

    @Test(arguments: [AccountStatus.submitted, .kyc_review, .ibkr_pending, .action_required, .rejected])
    func anyOtherStatusLandsOnTheAccountStatus(status: AccountStatus) {
        #expect(Landing.for(status) == .accountStatus)
    }

    // TODO(decisão) 1: a status this version does not know never opens the tabs (and so never
    // shows deposit instructions); the status screen shows generic text.
    @Test func anUnknownStatusLandsOnTheAccountStatus() {
        #expect(Landing.for(.unknown("frozen")) == .accountStatus)
    }
}

@Suite struct AccountTimelineTests {
    private func summary(_ status: AccountStatus) -> [String]? {
        AccountTimeline.steps(for: status)?.map { "\($0.id.rawValue):\($0.status.rawValue)\($0.needsDocuments ? "+note" : "")" }
    }

    @Test func walksTheOpeningPath() {
        #expect(summary(.submitted) == ["submitted:current", "kyc_review:upcoming", "ibkr_pending:upcoming", "open:upcoming"])
        #expect(summary(.kyc_review) == ["submitted:done", "kyc_review:current", "ibkr_pending:upcoming", "open:upcoming"])
        #expect(summary(.open) == ["submitted:done", "kyc_review:done", "ibkr_pending:done", "open:done"])
    }

    // action_required mirrors a request from Interactive Brokers: their step is current, not an error.
    @Test func actionRequiredSitsOnTheIBKRStepWithANote() {
        #expect(summary(.action_required) == ["submitted:done", "kyc_review:done", "ibkr_pending:current+note", "open:upcoming"])
    }

    @Test(arguments: [AccountStatus.draft, .rejected, .restricted, .unknown("frozen")])
    func hasNoTimelineOffThePath(status: AccountStatus) {
        #expect(AccountTimeline.steps(for: status) == nil)
    }
}

@Suite struct AccountStatusCopyTests {
    @Test func usesOneTitleAndBodyKeyPerStatus() {
        #expect(AccountStatusCopy.titleKey(.ibkr_pending) == "account.title.ibkr_pending")
        #expect(AccountStatusCopy.bodyKey(.ibkr_pending) == "account.body.waiting")
        #expect(AccountStatusCopy.bodyKey(.submitted) == "account.body.waiting")
        #expect(AccountStatusCopy.bodyKey(.action_required) == "account.body.action_required")
    }

    @Test func fallsBackToGenericTextForAnUnknownStatus() {
        #expect(AccountStatusCopy.titleKey(.unknown("frozen")) == "account.title.unknown")
        #expect(AccountStatusCopy.bodyKey(.unknown("frozen")) == "account.body.unknown")
    }

    @Test func offersSupportOnlyWhenTheClientCannotMoveOn() {
        #expect(AccountStatusCopy.offersSupport(.rejected))
        #expect(AccountStatusCopy.offersSupport(.restricted))
        #expect(AccountStatusCopy.offersSupport(.unknown("frozen")))
        #expect(!AccountStatusCopy.offersSupport(.ibkr_pending))
    }

    @Test func everyKnownStatusHasItsOwnTitle() {
        let keys = Set(AccountStatus.knownCases.map(AccountStatusCopy.titleKey))
        #expect(keys.count == AccountStatus.knownCases.count)
    }
}

@Suite struct ErrorCopyTests {
    @Test func translatesEveryErrorByCode() {
        #expect(ClientErrorCode.allCases.map(\.copyKey).first == "errors.validation_failed")
        #expect(ClientErrorCode.network.copyKey == "errors.network")
    }
}
