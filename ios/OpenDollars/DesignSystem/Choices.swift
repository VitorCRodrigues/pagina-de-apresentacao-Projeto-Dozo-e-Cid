import OpenDollarsCore
import SwiftUI

// Controls of the onboarding forms, in the statement language: rules between options, no cards.
// Every option carries an identifier (`<id>.<value>`) for VoiceOver order and UI tests.

/// One option of a list: the value saved, the label shown.
struct ChoiceOption: Identifiable, Hashable, Sendable {
    let value: String
    let label: String
    var id: String { value }
}

/// "Paso 3 de 8" with one segment per step (web: Stepper.tsx): done and current in navy, the
/// current one taller, the rest grey.
struct ODStepper: View {
    let current: Int
    let total: Int

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space2) {
            HStack(spacing: ODMetric.space1) {
                ForEach(1...max(total, 1), id: \.self) { index in
                    Capsule()
                        .fill(index <= current ? ODColor.navy900 : ODColor.gray200)
                        .frame(height: index == current ? 4 : 2)
                }
            }
            .accessibilityHidden(true)
            Text(Strings.stepperProgress(current: String(current), total: String(total)))
                .odText(.caption)
                .foregroundStyle(ODColor.gray600)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("stepper")
    }
}

/// A question with one answer: a radio list between rules. Reports the choice through `select`
/// (plain closures, not Binding(get:set:), whose functions must be Sendable).
struct SingleChoiceList: View {
    let label: String
    var hint: String?
    let options: [ChoiceOption]
    let selection: String?
    var error: String?
    let identifier: String
    let select: (String) -> Void

    var body: some View {
        ChoiceGroup(label: label, hint: hint, error: error) {
            ForEach(options) { option in
                ChoiceRow(label: option.label, isOn: selection == option.value, isMulti: false) {
                    select(option.value)
                }
                .accessibilityIdentifier("\(identifier).\(option.value)")
            }
        }
    }
}

/// A question with several answers: check boxes between rules. `toggle` adds or removes one.
struct MultiChoiceList: View {
    let label: String
    var hint: String?
    let options: [ChoiceOption]
    let selection: [String]
    var error: String?
    let identifier: String
    let toggle: (String) -> Void

    var body: some View {
        ChoiceGroup(label: label, hint: hint, error: error) {
            ForEach(options) { option in
                ChoiceRow(label: option.label, isOn: selection.contains(option.value), isMulti: true) {
                    toggle(option.value)
                }
                .accessibilityIdentifier("\(identifier).\(option.value)")
            }
        }
    }
}

private struct ChoiceGroup<Rows: View>: View {
    let label: String
    var hint: String?
    var error: String?
    @ViewBuilder var rows: Rows

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space2) {
            Text(label)
                .odText(.label)
                .foregroundStyle(ODColor.graphite900)
                .accessibilityAddTraits(.isHeader)
            if let hint {
                Text(hint).odText(.caption).foregroundStyle(ODColor.gray600)
            }
            Ledger { rows }
            if let error { FieldError(text: error) }
        }
    }
}

private struct ChoiceRow: View {
    let label: String
    let isOn: Bool
    let isMulti: Bool
    let select: () -> Void

    var body: some View {
        LedgerItem {
            Button(action: select) {
                HStack(alignment: .firstTextBaseline, spacing: ODMetric.space3) {
                    Image(systemName: marker)
                        .foregroundStyle(isOn ? ODColor.navy900 : ODColor.gray500)
                        .accessibilityHidden(true)
                    Text(label)
                        .odText(.body)
                        .foregroundStyle(ODColor.graphite900)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                }
                .frame(minHeight: ODMetric.minTapTarget)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(isOn ? .isSelected : [])
        }
    }

    private var marker: String {
        switch (isMulti, isOn) {
        case (false, true): "circle.inset.filled"
        case (false, false): "circle"
        case (true, true): "checkmark.square.fill"
        case (true, false): "square"
        }
    }
}

/// A box the client ticks (a terms document): a toggle for VoiceOver.
struct ODCheckbox: View {
    let label: String
    let isOn: Bool
    let toggle: () -> Void
    var error: String?
    let identifier: String

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space1) {
            Button(action: toggle) {
                HStack(alignment: .firstTextBaseline, spacing: ODMetric.space3) {
                    Image(systemName: isOn ? "checkmark.square.fill" : "square")
                        .foregroundStyle(isOn ? ODColor.navy900 : ODColor.gray500)
                        .accessibilityHidden(true)
                    Text(label)
                        .odText(.body)
                        .foregroundStyle(ODColor.graphite900)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                }
                .frame(minHeight: ODMetric.minTapTarget)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(isOn ? [.isToggle, .isSelected] : .isToggle)
            .accessibilityIdentifier(identifier)
            if let error { FieldError(text: error) }
        }
    }
}

/// An error under a control: brick, with an icon (as ODTextField's).
struct FieldError: View {
    let text: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: "exclamationmark.circle").accessibilityHidden(true)
            Text(text)
        }
        .odText(.caption)
        .foregroundStyle(ODColor.brick700)
    }
}

/// A choice from a long list (a country, a province): looks like a field and opens the list in
/// a sheet. Shows "Elegir" until something is picked.
struct PickerField: View {
    let label: String
    let selection: String?
    let options: [ChoiceOption]
    var error: String?
    let identifier: String
    let select: (String) -> Void

    @State private var isOpen = false

    private var selectedLabel: String? { options.first { $0.value == selection }?.label }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).odText(.label).foregroundStyle(ODColor.graphite900).accessibilityHidden(true)
            Button { isOpen = true } label: {
                HStack {
                    Text(selectedLabel ?? Strings.iosPickerChoose)
                        .odText(.body)
                        .foregroundStyle(selectedLabel == nil ? ODColor.gray600 : ODColor.graphite900)
                    Spacer(minLength: ODMetric.space2)
                    Image(systemName: "chevron.down").foregroundStyle(ODColor.gray600).accessibilityHidden(true)
                }
                .padding(.horizontal, ODMetric.space3)
                .frame(minHeight: ODMetric.controlHeight)
                .background(RoundedRectangle(cornerRadius: ODMetric.radiusControl).fill(ODColor.paper))
                .overlay(RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                    .strokeBorder(error == nil ? ODColor.gray500 : ODColor.brick700, lineWidth: ODMetric.hairline))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(label)
            .accessibilityValue(selectedLabel ?? Strings.iosPickerChoose)
            .accessibilityHint(error ?? "")
            .accessibilityIdentifier(identifier)
            if let error { FieldError(text: error) }
        }
        .sheet(isPresented: $isOpen) {
            NavigationStack {
                List(options) { option in
                    Button {
                        select(option.value)
                        isOpen = false
                    } label: {
                        HStack {
                            Text(option.label).odText(.body).foregroundStyle(ODColor.graphite900)
                            Spacer()
                            if option.value == selection {
                                Image(systemName: "checkmark").foregroundStyle(ODColor.navy900).accessibilityHidden(true)
                            }
                        }
                    }
                    .accessibilityAddTraits(option.value == selection ? .isSelected : [])
                    .accessibilityIdentifier("\(identifier).\(option.value)")
                }
                .listStyle(.plain)
                .navigationTitle(label)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(Strings.commonClose) { isOpen = false }
                    }
                }
            }
        }
    }
}

/// A date the client picks (the birth date): empty ("Elegir fecha") until they confirm a date in
/// a wheel picker, never later than today. A resumed draft shows the saved date. The age rule
/// stays in the core (TODO(decisão) 27).
struct DateField: View {
    let label: String
    @Binding var date: CalendarDate?
    var error: String?
    let identifier: String

    @State private var isOpen = false
    @State private var picking = Date()

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).odText(.label).foregroundStyle(ODColor.graphite900).accessibilityHidden(true)
            Button(action: open) {
                HStack {
                    Text(date.map(Self.format) ?? Strings.iosOnboardingBirthDatePick)
                        .odText(.body)
                        .foregroundStyle(date == nil ? ODColor.gray600 : ODColor.graphite900)
                    Spacer(minLength: ODMetric.space2)
                    Image(systemName: "calendar").foregroundStyle(ODColor.gray600).accessibilityHidden(true)
                }
                .padding(.horizontal, ODMetric.space3)
                .frame(minHeight: ODMetric.controlHeight)
                .background(RoundedRectangle(cornerRadius: ODMetric.radiusControl).fill(ODColor.paper))
                .overlay(RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                    .strokeBorder(error == nil ? ODColor.gray500 : ODColor.brick700, lineWidth: ODMetric.hairline))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(label)
            .accessibilityValue(date.map(Self.format) ?? Strings.iosOnboardingBirthDatePick)
            .accessibilityHint(error ?? "")
            .accessibilityIdentifier(identifier)
            if let error { FieldError(text: error) }
        }
        .sheet(isPresented: $isOpen) {
            VStack(spacing: ODMetric.space4) {
                Text(label).odText(.heading).foregroundStyle(ODColor.navy900).accessibilityAddTraits(.isHeader)
                DatePicker(label, selection: $picking, in: ...Date(), displayedComponents: .date)
                    .datePickerStyle(.wheel)
                    .labelsHidden()
                    .environment(\.locale, L10n.foundationLocale)
                    .accessibilityIdentifier("\(identifier).wheel")
                Button(Strings.iosDatePickerConfirm) {
                    date = Self.calendarDate(picking)
                    isOpen = false
                }
                .buttonStyle(.odPrimary)
                .accessibilityIdentifier("\(identifier).confirm")
            }
            .padding(ODMetric.gutter)
            .background(ODColor.cream50)
            .presentationDetents([.medium])
        }
    }

    private func open() {
        // The wheel starts on the saved date, or thirty years back; the field stays empty until
        // the client confirms.
        picking = date.map(Self.date) ?? Calendar(identifier: .gregorian).date(byAdding: .year, value: -30, to: Date()) ?? Date()
        isOpen = true
    }

    private static var calendar: Calendar { Calendar(identifier: .gregorian) }

    /// Noon, so no time zone can move the day.
    static func date(_ day: CalendarDate) -> Date {
        calendar.date(from: DateComponents(year: day.year, month: day.month, day: day.day, hour: 12)) ?? Date()
    }

    static func calendarDate(_ date: Date) -> CalendarDate {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return CalendarDate(year: parts.year ?? 2000, month: parts.month ?? 1, day: parts.day ?? 1)
    }

    static func format(_ day: CalendarDate) -> String {
        date(day).formatted(Date.FormatStyle(date: .long, time: .omitted).locale(L10n.foundationLocale))
    }
}

/// Samples shared by the previews and the catalog.
struct ChoiceSamples: View {
    @State private var single: String? = "savings"
    @State private var multi: [String] = ["funds"]
    @State private var birth: CalendarDate?
    private let options = [
        ChoiceOption(value: "retirement", label: Strings.onboardingFundsOccupationsRetired),
        ChoiceOption(value: "savings", label: Strings.onboardingFundsSourcesSavings),
        ChoiceOption(value: "funds", label: Strings.onboardingFundsSourcesInvestments),
    ]

    var body: some View {
        ODStepper(current: 3, total: 8)
        SingleChoiceList(label: Strings.onboardingFundsSource, options: options, selection: single, identifier: "sample.single") { single = $0 }
        MultiChoiceList(label: Strings.onboardingFundsOccupation, hint: Strings.onboardingSuitabilityMultiHint, options: options, selection: multi, error: Strings.onboardingErrorsPickOne, identifier: "sample.multi") { value in
            if let index = multi.firstIndex(of: value) { multi.remove(at: index) } else { multi.append(value) }
        }
        ODCheckbox(label: Strings.onboardingTermsAccept(title: Strings.onboardingStepsTerms), isOn: true, toggle: {}, identifier: "sample.check")
        PickerField(label: Strings.onboardingAddressProvince, selection: nil, options: options, identifier: "sample.picker") { _ in }
        DateField(label: Strings.onboardingPersonalBirthDate, date: $birth, error: Strings.onboardingErrorsRequired, identifier: "sample.date")
    }
}

#Preview("ES") { PreviewSurface { ChoiceSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { ChoiceSamples() } }
