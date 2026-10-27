import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

const meta = preview.meta({ title: "Primitives/Dialog", component: Dialog });

export const Confirm = meta.story({
  render: () => (
    <Dialog
      defaultOpen
      title={i18n.t("demo:dialog.title")}
      description={i18n.t("demo:dialog.body")}
      footer={
        <>
          <Button variant="destructive" fullWidth="always">
            {i18n.t("demo:dialog.confirm")}
          </Button>
          <Button variant="ghost" fullWidth="always">
            {i18n.t("demo:dialog.dismiss")}
          </Button>
        </>
      }
    />
  ),
});
