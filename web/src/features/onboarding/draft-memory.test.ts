import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { forgetStep, recallStep, rememberStep } from "./draft-memory";

describe("unsaved step memory", () => {
  it("keeps what was typed until it is saved", () => {
    const queryClient = new QueryClient();
    rememberStep(queryClient, "personal", { dni: "30123456" });
    expect(recallStep(queryClient, "personal")).toEqual({ dni: "30123456" });
    forgetStep(queryClient, "personal");
    expect(recallStep(queryClient, "personal")).toBeUndefined();
  });

  it("is dropped with the session data on sign-out", () => {
    const queryClient = new QueryClient();
    rememberStep(queryClient, "personal", { dni: "30123456" });
    // What ApiProvider does when the session ends.
    queryClient.removeQueries({ queryKey: ["session"] });
    expect(recallStep(queryClient, "personal")).toBeUndefined();
  });
});
