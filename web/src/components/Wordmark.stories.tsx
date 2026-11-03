import preview from "../../.storybook/preview";
import { Wordmark } from "./Wordmark";

const meta = preview.meta({ title: "Primitives/Wordmark", component: Wordmark });

// Small size, for tight spaces. The app header uses BrandSymbol instead.
export const Small = meta.story({ args: { size: "sm" } });

// Entry screen size (T1).
export const Large = meta.story({ args: { size: "lg" } });

// The cream version, for navy backgrounds.
export const OnInverse = meta.story({
  render: () => (
    <div className="rounded-card bg-navy-900 p-5">
      <Wordmark size="lg" tone="inverse" />
    </div>
  ),
});
