import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, ErrorState, Maintenance, NotFoundState, SessionExpired } from "./PageState";

describe("page states", () => {
  it.each([
    ["not found", <NotFoundState onHome={() => undefined} />],
    ["session expired", <SessionExpired onSignIn={() => undefined} />],
    ["maintenance", <Maintenance locale="es" />],
    ["an error that takes the whole page", <ErrorState page onRetry={() => undefined} />],
  ])("%s is a whole page, so its title is the page's h1", (_name, element) => {
    render(element);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it.each([
    ["empty", <EmptyState title="x" />],
    ["error", <ErrorState onRetry={() => undefined} />],
  ])("%s sits inside a screen with its own h1, so its title is an h2", (_name, element) => {
    render(element);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
