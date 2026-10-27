import { useMemo } from "react";
import { encode } from "uqr";

interface QrCodeProps {
  value: string;
  // Accessible name, e.g. "QR code of the deposit address".
  label: string;
  size?: number;
}

const QUIET_ZONE = 4;

// Generated in the browser: the address never leaves the device to draw a QR code.
export function QrCode({ value, label, size = 192 }: QrCodeProps) {
  const { path, extent } = useMemo(() => {
    const { data } = encode(value, { ecc: "M", border: 0 });
    const commands: string[] = [];
    data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) commands.push(`M${String(x + QUIET_ZONE)} ${String(y + QUIET_ZONE)}h1v1h-1z`);
      });
    });
    return { path: commands.join(""), extent: data.length + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${String(extent)} ${String(extent)}`}
      shapeRendering="crispEdges"
      className="rounded-control border border-gray-200"
    >
      <rect width={extent} height={extent} className="fill-paper" />
      <path d={path} className="fill-graphite-900" />
    </svg>
  );
}
