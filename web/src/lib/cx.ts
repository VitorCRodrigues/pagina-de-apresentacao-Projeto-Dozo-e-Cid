import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge taught the project's own tokens (src/styles/tokens.css and typography.css),
// so a className passed to a component replaces the conflicting default instead of losing to
// it by CSS order.
const merge = extendTailwindMerge<"type-style">({
  extend: {
    theme: {
      radius: ["control", "card"],
      shadow: ["hairline", "overlay"],
      ease: ["od"],
    },
    classGroups: {
      duration: [{ duration: ["fast", "base"] }],
      "type-style": [
        {
          type: [
            "display",
            "title",
            "heading",
            "body",
            "label",
            "caption",
            "value",
            "value-lg",
            "value-display",
            "mono",
          ],
        },
      ],
    },
  },
});

export function cx(...classes: Array<string | false | null | undefined>): string {
  return merge(classes);
}
