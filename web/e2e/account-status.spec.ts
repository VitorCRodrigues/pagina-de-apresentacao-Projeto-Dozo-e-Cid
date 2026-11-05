import { expect, test } from "@playwright/test";

// T3, documents Interactive Brokers asks for: a real multipart upload from the browser, one file
// from the files and one photo through the camera input (capture), then nothing left to send.
test.use({ locale: "es-AR" });

// A tiny valid PDF and a JPEG header are enough: the client checks type and size, the mock
// checks that a file part and the pending item id arrive.
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2048, 1)]);

test("sends a document from the files and a photo from the camera, as multipart", async ({
  page,
}) => {
  await page.goto("/?scenario=action_required");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(
    page.getByRole("heading", { name: "Interactive Brokers necesita documentos" }),
  ).toBeVisible();

  // The mock answers 422 unless the multipart body carries pendingItemId and a file part
  // (handlers.ts, readUpload with the browser's own formData()): an item leaving the list is the
  // proof that a real multipart upload went through.
  const address = page.getByRole("listitem").filter({ hasText: "Comprobante de domicilio" });
  await address
    .getByLabel("Elegir archivo")
    .setInputFiles({ name: "factura.pdf", mimeType: "application/pdf", buffer: pdf });
  await address.getByRole("button", { name: "Enviar documento" }).click();
  await expect(page.getByText("Comprobante de domicilio")).toHaveCount(0);

  const dni = page.getByRole("listitem").filter({ hasText: "Foto del dorso del DNI" });
  const camera = dni.getByLabel("Sacar una foto");
  await expect(camera).toHaveAttribute("capture", "environment");
  await camera.setInputFiles({ name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await expect(dni.getByRole("img", { name: "Vista previa de IMG_0001.jpg" })).toBeVisible();
  await dni.getByRole("button", { name: "Enviar documento" }).click();
  await expect(page.getByText(/Recibimos todos los documentos/)).toBeVisible();
});

test("refuses a file of the wrong type before sending anything", async ({ page }) => {
  await page.goto("/?scenario=action_required");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  const address = page.getByRole("listitem").filter({ hasText: "Comprobante de domicilio" });
  await address
    .getByLabel("Elegir archivo")
    .setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(address.getByText("Usá un archivo JPG, PNG o PDF.")).toBeVisible();
  await expect(address.getByRole("button", { name: "Enviar documento" })).toHaveCount(0);
});
