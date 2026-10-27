import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Stepper } from "./Stepper";

const meta = preview.meta({ title: "Primitives/Stepper", component: Stepper });

function steps(): string[] {
  return i18n.t("demo:stepper.steps", { returnObjects: true });
}

export const First = meta.story({ render: () => <Stepper steps={steps()} current={0} /> });

export const Middle = meta.story({ render: () => <Stepper steps={steps()} current={3} /> });

export const Last = meta.story({ render: () => <Stepper steps={steps()} current={7} /> });
