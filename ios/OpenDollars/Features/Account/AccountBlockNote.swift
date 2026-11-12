import OpenDollarsCore
import SwiftUI

/// Decision 14 (web: AccountBlockNote.tsx): a blocked account keeps the navigation; Início and
/// Aportar say why deposits stop, as a warning note, and offer support when only support can help.
/// The text never reveals a compliance reason (PRD section 5).
struct AccountBlockNote: View {
    let block: AccountBlock

    var body: some View {
        Notice(tone: .warning, title: L10n.text(block.messageKey)) {
            switch block.action {
            case .support:
                Link(L10n.text(block.actionKey), destination: AppConstants.supportURL)
                    .buttonStyle(.odGhost)
            // TODO(decisão) 21: "Ver pendientes" and the waitlist arrive with the Pendientes tab and
            // the waitlist form; until then the note explains without a link.
            case .followUp, .waitlist:
                EmptyView()
            }
        }
        .accessibilityIdentifier("account.block")
    }
}

#Preview("ES") {
    PreviewSurface {
        AccountBlockNote(block: AccountBlock(reason: .ibkr_restricted, action: .support))
        AccountBlockNote(block: AccountBlock(reason: .ibkr_not_open, action: .followUp))
    }
}

#Preview("ES · AX3") {
    PreviewSurface(dynamicTypeSize: .accessibility3) {
        AccountBlockNote(block: AccountBlock(reason: .compliance_hold, action: .support))
    }
}
