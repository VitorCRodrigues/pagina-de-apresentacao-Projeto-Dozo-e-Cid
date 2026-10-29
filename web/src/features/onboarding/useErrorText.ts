import { useTranslation } from "react-i18next";
import type { ErrorCode } from "./schemas";

// Schemas speak in error codes; this turns a field error into the translated sentence.
export function useErrorText() {
  const { t } = useTranslation();
  return (error: { message?: string | undefined } | undefined) =>
    error?.message ? t(`onboarding.errors.${error.message as ErrorCode}`) : undefined;
}
