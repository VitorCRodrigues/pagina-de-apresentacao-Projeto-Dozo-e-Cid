import type { PendingItem } from "@/api/types";
import preview from "../../../.storybook/preview";
import { DocumentUpload } from "./DocumentUpload";

const item: PendingItem = {
  id: "pend-address-proof",
  kind: "document",
  title: "Comprobante de domicilio",
  description: "Interactive Brokers pide una factura de servicios de los últimos 3 meses.",
};

const meta = preview.meta({
  title: "Account/DocumentUpload",
  component: DocumentUpload,
  render: (args) => (
    <ul className="border-y border-gray-200">
      <DocumentUpload {...args} />
    </ul>
  ),
});

const pdf = () => new File(["%PDF-1.7"], "factura-luz.pdf", { type: "application/pdf" });

export const Idle = meta.story({ args: { item, upload: () => Promise.resolve() } });

export const Chosen = meta.story({
  args: { item, upload: () => Promise.resolve() },
  play: async ({ canvas, userEvent }) => {
    await userEvent.upload(canvas.getByLabelText("Elegir archivo"), pdf());
  },
});

// Over the 10 MB limit: refused before anything is sent.
export const TooBig = meta.story({
  args: { item, upload: () => Promise.resolve() },
  play: async ({ canvas, userEvent }) => {
    await userEvent.upload(
      canvas.getByLabelText("Elegir archivo"),
      new File([new Uint8Array(11 * 1024 * 1024)], "foto-dni.jpg", { type: "image/jpeg" }),
    );
  },
});

// Stops at 40%, so the progress bar stays on screen.
export const Sending = meta.story({
  args: {
    item,
    upload: (_file: File, onProgress: (fraction: number) => void) => {
      onProgress(0.4);
      return new Promise(() => undefined);
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.upload(canvas.getByLabelText("Elegir archivo"), pdf());
    await userEvent.click(canvas.getByRole("button", { name: "Enviar documento" }));
  },
});

export const SendFailed = meta.story({
  args: { item, upload: () => Promise.reject(new Error("offline")) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.upload(canvas.getByLabelText("Elegir archivo"), pdf());
    await userEvent.click(canvas.getByRole("button", { name: "Enviar documento" }));
  },
});
