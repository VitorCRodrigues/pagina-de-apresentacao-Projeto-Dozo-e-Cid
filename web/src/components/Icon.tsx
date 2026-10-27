import type { LucideIcon } from "lucide-react";

interface IconProps {
  icon: LucideIcon;
  size?: 12 | 16 | 20 | 24;
  className?: string;
}

// Lucide with a thin stroke everywhere. Icons are decorative: meaning always comes from text.
export function Icon({ icon: Glyph, size = 20, className }: IconProps) {
  return (
    <Glyph
      aria-hidden={true}
      focusable={false}
      size={size}
      strokeWidth={1.5}
      className={className}
    />
  );
}
