import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Timeline, type TimelineStep } from "./Timeline";

const meta = preview.meta({ title: "Domain/Timeline" });

const nextWindow = "2026-11-05T14:00:00Z";

function windowDate(locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(nextWindow));
}

// ar_usdc: fx_executed and wire_sent are hidden; partner_collected reads "USDC received".
function usdcWaiting(): TimelineStep[] {
  return [
    { id: "kyc", label: i18n.t("demo:timeline.kyc"), status: "done", at: "2026-10-20T13:10:00Z" },
    { id: "ibkr", label: i18n.t("demo:timeline.ibkr"), status: "done", at: "2026-10-23T16:42:00Z" },
    {
      id: "notified",
      label: i18n.t("demo:timeline.notified"),
      status: "current",
      at: "2026-10-27T12:05:00Z",
      note: i18n.t("demo:timeline.notifiedNote"),
    },
    { id: "collected", label: i18n.t("demo:timeline.usdcReceived"), status: "upcoming" },
    { id: "credited", label: i18n.t("demo:timeline.credited"), status: "upcoming" },
    { id: "invested", label: i18n.t("demo:timeline.invested"), status: "upcoming" },
  ];
}

export const UsdcWaitingForDeposit = meta.story({
  render: (_args, { globals }) => (
    <Timeline
      label={i18n.t("demo:timeline.label")}
      steps={usdcWaiting()}
      locale={storyLocale(globals)}
    />
  ),
});

export const SwiftCreditedWaitingWindow = meta.story({
  render: (_args, { globals }) => {
    const locale = storyLocale(globals);
    return (
      <Timeline
        label={i18n.t("demo:timeline.label")}
        locale={locale}
        steps={[
          {
            id: "notified",
            label: i18n.t("demo:timeline.notified"),
            status: "done",
            at: "2026-10-27T12:05:00Z",
          },
          {
            id: "collected",
            label: i18n.t("demo:timeline.collected"),
            status: "done",
            at: "2026-10-28T15:20:00Z",
          },
          {
            id: "fx",
            label: i18n.t("demo:timeline.fx"),
            status: "done",
            at: "2026-10-28T15:21:00Z",
          },
          {
            id: "wire",
            label: i18n.t("demo:timeline.wire"),
            status: "done",
            at: "2026-10-28T18:02:00Z",
          },
          {
            id: "credited",
            label: i18n.t("demo:timeline.credited"),
            status: "current",
            at: "2026-10-30T11:30:00Z",
            note: i18n.t("demo:timeline.creditedNote", {
              date: windowDate(locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-AR"),
            }),
          },
          { id: "invested", label: i18n.t("demo:timeline.invested"), status: "upcoming" },
        ]}
      />
    );
  },
});

export const Invested = meta.story({
  render: (_args, { globals }) => (
    <Timeline
      label={i18n.t("demo:timeline.label")}
      locale={storyLocale(globals)}
      steps={[
        {
          id: "notified",
          label: i18n.t("demo:timeline.notified"),
          status: "done",
          at: "2026-10-01T12:05:00Z",
        },
        {
          id: "collected",
          label: i18n.t("demo:timeline.usdcReceived"),
          status: "done",
          at: "2026-10-01T12:40:00Z",
        },
        {
          id: "credited",
          label: i18n.t("demo:timeline.credited"),
          status: "done",
          at: "2026-10-01T13:10:00Z",
        },
        {
          id: "invested",
          label: i18n.t("demo:timeline.invested"),
          status: "done",
          at: "2026-10-05T14:00:00Z",
        },
      ]}
    />
  ),
});

export const Returned = meta.story({
  render: (_args, { globals }) => (
    <Timeline
      label={i18n.t("demo:timeline.label")}
      locale={storyLocale(globals)}
      steps={[
        {
          id: "notified",
          label: i18n.t("demo:timeline.notified"),
          status: "done",
          at: "2026-10-27T12:05:00Z",
        },
        {
          id: "returned",
          label: i18n.t("demo:timeline.returned"),
          status: "error",
          at: "2026-10-28T09:15:00Z",
          note: i18n.t("demo:timeline.returnedNote"),
        },
      ]}
    />
  ),
});
