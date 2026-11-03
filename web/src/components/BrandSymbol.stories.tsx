import preview from "../../.storybook/preview";
import { BrandSymbol } from "./BrandSymbol";

const meta = preview.meta({ title: "Primitives/BrandSymbol", component: BrandSymbol });

// App header (AppShell).
export const Default = meta.story({});

// The cream version, for navy backgrounds.
export const OnInverse = meta.story({
  render: () => (
    <div className="rounded-card bg-navy-900 p-5">
      <BrandSymbol tone="inverse" />
    </div>
  ),
});
