import { createContext, useContext } from "react";

export interface ToastMessage {
  title: string;
  description?: string;
  tone?: "neutral" | "error";
}

export const ToastContext = createContext<((message: ToastMessage) => void) | null>(null);

export function useToast(): (message: ToastMessage) => void {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}
