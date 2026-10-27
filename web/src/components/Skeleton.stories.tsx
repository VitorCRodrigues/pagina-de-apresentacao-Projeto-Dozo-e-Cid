import preview from "../../.storybook/preview";
import { Skeleton } from "./Skeleton";

const meta = preview.meta({ title: "Primitives/Skeleton", component: Skeleton });

export const Lines = meta.story({
  render: () => (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-48" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
});

export const CardBlock = meta.story({
  render: () => <Skeleton className="h-40 w-full rounded-card" />,
});
