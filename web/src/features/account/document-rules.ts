// TODO(decisão): accepted types and size for documents Interactive Brokers asks for.
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");
export const MAX_BYTES = 10 * 1024 * 1024;

export type DocumentProblem = "wrongType" | "tooBig" | "empty";

// Checked before anything is sent: the picker's accept attribute is only a hint.
export function documentProblem(file: File): DocumentProblem | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "wrongType";
  if (file.size === 0) return "empty";
  if (file.size > MAX_BYTES) return "tooBig";
  return null;
}

export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export function formatFileSize(bytes: number, intlLocale: string): string {
  const megabytes = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(intlLocale, {
    style: "unit",
    unit: megabytes ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(megabytes ? bytes / (1024 * 1024) : Math.max(bytes / 1024, 0.1));
}
