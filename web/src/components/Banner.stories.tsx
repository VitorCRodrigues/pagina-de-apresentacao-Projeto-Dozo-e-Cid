import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Banner } from "./Banner";
import { Button } from "./Button";

const meta = preview.meta({ title: "Primitives/Banner", component: Banner });

export const Info = meta.story({
  render: () => (
    <Banner tone="info" title={i18n.t("demo:banner.infoTitle")}>
      {i18n.t("demo:banner.infoBody")}
    </Banner>
  ),
});

export const Warning = meta.story({
  render: () => (
    <Banner tone="warning" title={i18n.t("demo:banner.warningTitle")}>
      {i18n.t("demo:banner.warningBody")}
    </Banner>
  ),
});

export const Error = meta.story({
  render: () => (
    <Banner tone="error" title={i18n.t("demo:banner.errorTitle")}>
      {i18n.t("demo:banner.errorBody")}
    </Banner>
  ),
});

export const WithAction = meta.story({
  render: () => (
    <Banner
      tone="error"
      title={i18n.t("demo:banner.errorTitle")}
      action={
        <Button variant="ghost" fullWidth="never" className="-ml-1 text-brick-700">
          {i18n.t("demo:banner.action")}
        </Button>
      }
    >
      {i18n.t("demo:banner.errorBody")}
    </Banner>
  ),
});
