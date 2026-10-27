import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Countdown } from "./Countdown";

const meta = preview.meta({ title: "Domain/Countdown", component: Countdown });

function inSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export const Running = meta.story({
  render: () => (
    <Countdown expiresAt={inSeconds(4 * 60 + 32)} label={i18n.t("demo:countdown.label")} />
  ),
});

export const LastMinute = meta.story({
  render: () => <Countdown expiresAt={inSeconds(42)} label={i18n.t("demo:countdown.label")} />,
});

export const Expired = meta.story({
  render: () => <Countdown expiresAt={inSeconds(-5)} label={i18n.t("demo:countdown.label")} />,
});
