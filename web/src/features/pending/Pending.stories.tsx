import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Pending", parameters: { frame: false } });

const item = (id: string, kind: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind,
  title,
  description: "Texto de ejemplo que llega traducido desde la API.",
  createdAt: "2026-10-30T12:00:00Z",
  ...extra,
});

const mixed = [
  item("a", "deposit_action", "Enviá el dinero de tu aporte", { depositId: "dep-scenario" }),
  item("d", "document", "Comprobante de domicilio", { dueAt: "2099-01-10T12:00:00Z" }),
  item("t", "terms", "Nueva versión del contrato de asesoría", { termsId: "terms-advisory" }),
  item("n", "notice", "Próxima ventana de inversión"),
];

const serve = (items: unknown[]) =>
  http.get("/api/v1/notifications", () => HttpResponse.json(items));

export const Grouped = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(serve(mixed));
  },
  render: () => <StoryApp path="/pendientes" scenario="terms_update" />,
});

export const Overdue = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      serve([
        item("late", "document", "Comprobante de domicilio", { dueAt: "2020-01-10T12:00:00Z" }),
        item("later", "document", "Constancia de CUIL", { dueAt: "2099-01-10T12:00:00Z" }),
      ]),
    );
  },
  render: () => <StoryApp path="/pendientes" />,
});

export const TermsDialog = meta.story({
  render: () => <StoryApp path="/pendientes" scenario="terms_update" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Revisar y aceptar" }));
  },
});

export const DocumentSheet = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(serve([item("d", "document", "Comprobante de domicilio")]));
  },
  render: () => <StoryApp path="/pendientes" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Enviar documento" }));
  },
});

export const PlanReminder = meta.story({
  render: () => <StoryApp path="/pendientes" scenario="plan_reminder" />,
});

export const Empty = meta.story({ render: () => <StoryApp path="/pendientes" scenario="empty" /> });

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/notifications", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/pendientes" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/notifications", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/pendientes" />,
});
