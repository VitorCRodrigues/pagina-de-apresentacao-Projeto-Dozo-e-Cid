import { createMemoryRouter, RouterProvider } from "react-router";
import { createMockAuthClient } from "@/api/auth";
import { AuthProvider } from "@/api/AuthProvider";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";
import { SessionTimeout } from "./SessionTimeout";

const meta = preview.meta({ title: "Screens/Global", parameters: { frame: false } });

export const SessionExpired = meta.story({
  render: () => <StoryApp path="/sesion-expirada" />,
});

export const Maintenance = meta.story({
  render: () => <StoryApp path="/inicio" scenario="maintenance" />,
});

export const NotFound = meta.story({
  render: () => <StoryApp path="/esta-pagina-no-existe" />,
});

// The inactivity warning, opened right away (warning window = whole timeout).
export const InactivityWarning = meta.story({
  render: () => {
    const router = createMemoryRouter(
      [{ path: "*", element: <SessionTimeout timeoutMs={60_000} warningMs={60_000} /> }],
      { initialEntries: ["/inicio"] },
    );
    return (
      <AuthProvider client={createMockAuthClient()} initialSession={{ accessToken: "story" }}>
        <RouterProvider router={router} />
      </AuthProvider>
    );
  },
});
