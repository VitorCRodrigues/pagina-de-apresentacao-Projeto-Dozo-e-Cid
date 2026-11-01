import { describe, expect, it } from "vitest";
import type { Notification } from "@/api/proposed-types";
import { groupPending, isOverdue, pendingKinds } from "./pending-order";

const item = (
  id: string,
  kind: Notification["kind"],
  extra: Partial<Notification> = {},
): Notification => ({
  id,
  kind,
  title: id,
  description: "",
  createdAt: "2026-10-01T12:00:00Z",
  ...extra,
});

const ids = (groups: ReturnType<typeof groupPending>) =>
  groups.map((group) => [group.kind, group.items.map((i) => i.id)]);

describe("groupPending (T11)", () => {
  it("orders groups money first, whatever order the API sends", () => {
    expect(pendingKinds).toEqual(["deposit_action", "document", "terms", "notice"]);
    const groups = groupPending([
      item("n", "notice"),
      item("t", "terms"),
      item("d", "document"),
      item("a", "deposit_action"),
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["deposit_action", "document", "terms", "notice"]);
  });

  it("leaves out empty groups", () => {
    expect(ids(groupPending([item("n", "notice")]))).toEqual([["notice", ["n"]]]);
    expect(groupPending([])).toEqual([]);
  });

  it("puts deadlines first, the nearest on top, then the rest newest first", () => {
    const groups = groupPending([
      item("no-due-old", "document", { createdAt: "2026-09-01T12:00:00Z" }),
      item("due-later", "document", { dueAt: "2026-11-10T12:00:00Z" }),
      item("no-due-new", "document", { createdAt: "2026-10-20T12:00:00Z" }),
      item("due-sooner", "document", { dueAt: "2026-11-03T12:00:00Z" }),
    ]);
    expect(ids(groups)).toEqual([
      ["document", ["due-sooner", "due-later", "no-due-new", "no-due-old"]],
    ]);
  });

  it("keeps the API order on a full tie and never mutates the input", () => {
    const input = [item("x", "notice"), item("y", "notice")];
    const groups = groupPending(input);
    expect(ids(groups)).toEqual([["notice", ["x", "y"]]]);
    expect(input.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("compares instants across time-zone offsets", () => {
    const groups = groupPending([
      item("utc", "terms", { dueAt: "2026-11-03T12:00:00Z" }),
      item("earlier", "terms", { dueAt: "2026-11-03T08:00:00-03:00" }),
    ]);
    expect(ids(groups)).toEqual([["terms", ["earlier", "utc"]]]);
  });
});

describe("read notifications", () => {
  it("leave the list once read, whatever the backend keeps", () => {
    const groups = groupPending([
      item("read", "notice", { readAt: "2026-10-31T12:00:00Z" }),
      item("unread", "notice"),
    ]);
    expect(ids(groups)).toEqual([["notice", ["unread"]]]);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("is true only once the deadline has passed", () => {
    expect(isOverdue(item("a", "document", { dueAt: "2026-11-01T11:59:00Z" }), now)).toBe(true);
    expect(isOverdue(item("b", "document", { dueAt: "2026-11-01T12:01:00Z" }), now)).toBe(false);
    expect(isOverdue(item("c", "document", { dueAt: "2026-11-01T10:00:00-03:00" }), now)).toBe(
      false,
    );
  });

  it("is false without a deadline", () => {
    expect(isOverdue(item("d", "notice"), now)).toBe(false);
  });
});
