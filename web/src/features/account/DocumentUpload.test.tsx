import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingItem } from "@/api/types";
import { DocumentUpload } from "./DocumentUpload";

const item: PendingItem = {
  id: "doc-address",
  kind: "document",
  title: "Comprobante de domicilio",
  description: "Una factura de servicios de los últimos 3 meses.",
};

const file = (name: string, type: string, size: number) => {
  const blob = new File(["x"], name, { type });
  Object.defineProperty(blob, "size", { value: size });
  return blob;
};

const createObjectURL = vi.fn(() => "blob:preview");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});
afterEach(() => {
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe("DocumentUpload", () => {
  it("accepts only JPG, PNG and PDF in the picker", () => {
    render(<DocumentUpload item={item} upload={vi.fn()} />);
    expect(screen.getByLabelText("Elegir archivo")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,application/pdf",
    );
  });

  it.each([
    [
      "a 25 MB file",
      file("dni.jpg", "image/jpeg", 25 * 1024 * 1024),
      "El archivo pesa más de 10 MB.",
    ],
    ["a HEIC photo", file("dni.heic", "image/heic", 1000), "Usá un archivo JPG, PNG o PDF."],
    ["an empty file", file("dni.pdf", "application/pdf", 0), "El archivo está vacío."],
  ])("refuses %s without sending anything", async (_name, chosen, message) => {
    const upload = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(<DocumentUpload item={item} upload={upload} />);
    await user.upload(screen.getByLabelText("Elegir archivo"), chosen);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar documento" })).toBeNull();
    expect(upload).not.toHaveBeenCalled();
  });

  it("previews an image and frees it when unmounted", async () => {
    const user = userEvent.setup();
    const view = render(<DocumentUpload item={item} upload={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("Elegir archivo"),
      file("factura.png", "image/png", 2000),
    );
    expect(screen.getByRole("img", { name: "Vista previa de factura.png" })).toHaveAttribute(
      "src",
      "blob:preview",
    );
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("shows a PDF by name, without a thumbnail", async () => {
    const user = userEvent.setup();
    render(<DocumentUpload item={item} upload={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("Elegir archivo"),
      file("factura.pdf", "application/pdf", 2000),
    );
    expect(screen.getByText("factura.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("sends the file and shows the progress", async () => {
    let report: (fraction: number) => void = () => undefined;
    const upload = vi.fn(
      (_file: File, onProgress: (fraction: number) => void) =>
        new Promise<void>(() => {
          report = onProgress;
        }),
    );
    const user = userEvent.setup();
    render(<DocumentUpload item={item} upload={upload} />);
    const chosen = file("factura.pdf", "application/pdf", 2000);
    await user.upload(screen.getByLabelText("Elegir archivo"), chosen);
    await user.click(screen.getByRole("button", { name: "Enviar documento" }));

    expect(upload).toHaveBeenCalledWith(chosen, expect.any(Function));
    report(0.4);
    await waitFor(() => {
      expect(screen.getByRole("progressbar", { name: "Enviando el documento" })).toHaveAttribute(
        "aria-valuenow",
        "40",
      );
    });
  });

  it("goes back to choosing a file once the send succeeds", async () => {
    const user = userEvent.setup();
    render(<DocumentUpload item={item} upload={() => Promise.resolve()} />);
    await user.upload(
      screen.getByLabelText("Elegir archivo"),
      file("factura.pdf", "application/pdf", 2000),
    );
    await user.click(screen.getByRole("button", { name: "Enviar documento" }));
    expect(await screen.findByLabelText("Elegir archivo")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar documento" })).toBeNull();
  });
});
