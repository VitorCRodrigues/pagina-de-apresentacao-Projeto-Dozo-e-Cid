import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Money } from "./Money";

const meta = preview.meta({ title: "Domain/Money" });

export const Display = meta.story({
  render: (_args, { globals }) => (
    <Money cents={1248050} locale={storyLocale(globals)} size="display" className="text-navy-900" />
  ),
});

export const DisplayOnInverse = meta.story({
  render: (_args, { globals }) => (
    <div className="rounded-card bg-navy-900 p-5">
      <Money
        cents={1248050}
        locale={storyLocale(globals)}
        size="display"
        className="text-gold-500"
      />
    </div>
  ),
});

export const Inline = meta.story({
  render: (_args, { globals }) => (
    <p className="type-body">
      <Money cents={25000} locale={storyLocale(globals)} />
    </p>
  ),
});

export const InlineNegative = meta.story({
  render: (_args, { globals }) => (
    <p className="type-body text-brick-700">
      <Money cents={-1250} locale={storyLocale(globals)} />
    </p>
  ),
});

// Same amount in every locale, to compare separators side by side.
export const AllLocales = meta.story({
  render: () => (
    <div className="flex flex-col gap-4">
      {(["es", "pt", "en"] as const).map((locale) => (
        <Money key={locale} cents={123456789} locale={locale} size="display" />
      ))}
    </div>
  ),
});
