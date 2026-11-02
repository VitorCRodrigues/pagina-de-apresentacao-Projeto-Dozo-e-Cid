import { describe, expect, it } from "vitest";
import type { TermsDocument } from "@/api/proposed-types";
import { acceptedTermsRows, pendingTerms } from "./terms-history";

const doc = (id: string, extra: Partial<TermsDocument> = {}): TermsDocument => ({
  id,
  kind: "advisory_agreement",
  version: "2026-11",
  title: `Doc ${id}`,
  url: `#${id}`,
  ...extra,
});

const summary = (docs: TermsDocument[]) =>
  acceptedTermsRows(docs).map((row) => [row.id, row.version, row.acceptedAt]);

describe("acceptedTermsRows", () => {
  it("lists the version in force once it is accepted", () => {
    expect(summary([doc("a", { acceptedAt: "2026-11-01T12:00:00Z" })])).toEqual([
      ["a", "2026-11", "2026-11-01T12:00:00Z"],
    ]);
  });

  it("keeps the record of an older version while the new one is pending", () => {
    const docs = [
      doc("a", { acceptances: [{ version: "2026-10", acceptedAt: "2026-10-01T12:00:00Z" }] }),
    ];
    expect(summary(docs)).toEqual([["a", "2026-10", "2026-10-01T12:00:00Z"]]);
    expect(pendingTerms(docs).map((d) => d.id)).toEqual(["a"]);
  });

  it("does not repeat a version found both in force and in the history", () => {
    const docs = [
      doc("a", {
        acceptedAt: "2026-11-01T12:00:00Z",
        acceptances: [{ version: "2026-11", acceptedAt: "2026-11-01T12:00:00Z" }],
      }),
    ];
    expect(summary(docs)).toHaveLength(1);
    expect(pendingTerms(docs)).toEqual([]);
  });

  it("gives each version its own line, most recent first, across time zones", () => {
    const docs = [
      doc("a", {
        acceptedAt: "2026-11-01T12:00:00Z",
        acceptances: [{ version: "2026-10", acceptedAt: "2026-10-01T12:00:00Z" }],
      }),
      doc("b", { acceptedAt: "2026-11-01T10:00:00-03:00" }),
    ];
    expect(summary(docs).map(([id, version]) => [id, version])).toEqual([
      ["b", "2026-11"],
      ["a", "2026-11"],
      ["a", "2026-10"],
    ]);
  });

  it("keeps the API order on a tie", () => {
    const at = "2026-11-01T12:00:00Z";
    expect(
      summary([doc("x", { acceptedAt: at }), doc("y", { acceptedAt: at })]).map(([id]) => id),
    ).toEqual(["x", "y"]);
  });

  it("has no line for a document never accepted, which is pending", () => {
    expect(summary([doc("a")])).toEqual([]);
    expect(pendingTerms([doc("a")]).map((d) => d.id)).toEqual(["a"]);
    expect(summary([])).toEqual([]);
  });
});
