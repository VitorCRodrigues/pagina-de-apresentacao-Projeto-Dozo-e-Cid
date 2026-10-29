import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Questionnaire, TermsDocument } from "@/api/proposed-types";
import { luciaPersonal } from "@/mocks/fixtures";
import {
  addressSchema,
  fundsSchema,
  personalSchema,
  questionnaireAnswersSchema,
  residenceSchema,
  termsFromDraft,
  termsSchema,
  toTermsDraft,
} from "./schemas";

// The first message of each failing path, so tests read as "field → error code".
function errors(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const out: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}

describe("residence", () => {
  it("requires two ISO country codes", () => {
    expect(residenceSchema.safeParse({ country: "AR", nationality: "UY" }).success).toBe(true);
    expect(errors(residenceSchema.safeParse({ country: "", nationality: "AR" }))).toEqual({
      country: "required",
    });
  });
});

describe("personal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 29, 10) });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const parse = (patch: Partial<typeof luciaPersonal>) =>
    personalSchema.safeParse({ ...luciaPersonal, ...patch });

  it("accepts Lucía", () => {
    expect(parse({}).success).toBe(true);
  });

  it("asks for the full name as in the document", () => {
    expect(errors(parse({ fullName: "Lucía" }))).toEqual({ fullName: "nameTwoWords" });
    expect(errors(parse({ fullName: "Lucía F3rnández" }))).toEqual({ fullName: "invalidName" });
    expect(parse({ fullName: "María José O'Connor-Peña" }).success).toBe(true);
  });

  it("checks the CUIL check digit", () => {
    expect(errors(parse({ cuil: "27301234560" }))).toEqual({ cuil: "cuitCheckDigit" });
  });

  it("rejects a valid CUIL that belongs to another DNI", () => {
    expect(errors(parse({ dni: "30123457" }))).toEqual({ cuil: "cuitDniMismatch" });
  });

  it("accepts a DNI with dots and a CUIL with dashes", () => {
    expect(parse({ dni: "30.123.456", cuil: "27-30123456-8" }).success).toBe(true);
  });

  it("needs 18 full years, counting the birthday itself", () => {
    expect(errors(parse({ birthDate: "2008-10-30" }))).toEqual({ birthDate: "underage" });
    expect(parse({ birthDate: "2008-10-29" }).success).toBe(true);
    expect(errors(parse({ birthDate: "1900-01-01" }))).toEqual({ birthDate: "invalidDate" });
    expect(errors(parse({ birthDate: "2001-02-30" }))).toEqual({ birthDate: "invalidDate" });
  });

  it("validates email and phone", () => {
    expect(errors(parse({ email: "not-an-email" }))).toEqual({ email: "invalidEmail" });
    expect(errors(parse({ phone: "12345" }))).toEqual({ phone: "invalidPhone" });
    expect(errors(parse({ phone: "+54 9 11 abc" }))).toEqual({ phone: "invalidPhone" });
  });
});

describe("address", () => {
  const address = { street: "Av. Corrientes 1234", city: "Buenos Aires", province: "C" };

  it("accepts a CPA and a 4-digit postal code", () => {
    expect(addressSchema.safeParse({ ...address, postalCode: "C1043AAZ" }).success).toBe(true);
    expect(addressSchema.safeParse({ ...address, postalCode: "1043" }).success).toBe(true);
  });

  it("rejects a short postal code and an unknown province", () => {
    expect(errors(addressSchema.safeParse({ ...address, postalCode: "C104" }))).toEqual({
      postalCode: "invalidPostalCode",
    });
    expect(
      errors(addressSchema.safeParse({ ...address, province: "XX", postalCode: "1043" })),
    ).toEqual({ province: "required" });
  });
});

describe("funds", () => {
  const funds = { occupation: "employee", sourceOfFunds: "salary", isPep: false };

  it("requires the PEP role only when the client is a PEP", () => {
    expect(fundsSchema.safeParse(funds).success).toBe(true);
    expect(errors(fundsSchema.safeParse({ ...funds, isPep: true }))).toEqual({
      pepRole: "required",
    });
    expect(fundsSchema.safeParse({ ...funds, isPep: true, pepRole: "Concejal" }).success).toBe(
      true,
    );
  });

  it("requires an answer to the PEP question", () => {
    expect(errors(fundsSchema.safeParse({ ...funds, isPep: undefined }))).toEqual({
      isPep: "required",
    });
  });
});

const docs: TermsDocument[] = [
  { id: "terms-advisory", kind: "advisory_agreement", version: "2", title: "A", url: "#a" },
  { id: "terms-ibkr-consent", kind: "ibkr_data_consent", version: "1", title: "B", url: "#b" },
];

describe("terms", () => {
  const at = "2026-10-29T13:00:00.000Z";

  it("needs every document checked, the IBKR consent included", () => {
    const schema = termsSchema(docs);
    expect(
      schema.safeParse({ checked: { "terms-advisory": at, "terms-ibkr-consent": at } }).success,
    ).toBe(true);
    expect(
      errors(schema.safeParse({ checked: { "terms-advisory": at, "terms-ibkr-consent": "" } })),
    ).toEqual({
      "checked.terms-ibkr-consent": "termsRequired",
    });
  });

  it("saves id, version and acceptedAt for each document", () => {
    expect(toTermsDraft(docs, { "terms-advisory": at, "terms-ibkr-consent": at })).toEqual({
      accepted: [
        { id: "terms-advisory", version: "2", acceptedAt: at },
        { id: "terms-ibkr-consent", version: "1", acceptedAt: at },
      ],
    });
  });

  it("does not carry over the acceptance of an old version", () => {
    const draft = {
      accepted: [
        { id: "terms-advisory", version: "1", acceptedAt: "2026-10-01T00:00:00Z" },
        { id: "terms-ibkr-consent", version: "1", acceptedAt: "2026-10-01T00:00:00Z" },
      ],
    };
    expect(termsFromDraft(docs, draft)).toEqual({ "terms-ibkr-consent": "2026-10-01T00:00:00Z" });
    expect(termsFromDraft(docs, undefined)).toEqual({});
  });
});

describe("questionnaire answers", () => {
  const questionnaire: Questionnaire = {
    version: "test",
    questions: [
      {
        id: "q1",
        kind: "single",
        label: "Q1",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      {
        id: "q2",
        kind: "multi",
        label: "Q2",
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
        ],
      },
    ],
  };
  const schema = questionnaireAnswersSchema(questionnaire);

  it("builds one key per API question id", () => {
    expect(schema.safeParse({ q1: "a", q2: ["x", "y"] }).success).toBe(true);
  });

  it("rejects an unanswered multi and an option the API did not send", () => {
    expect(errors(schema.safeParse({ q1: "c", q2: [] }))).toEqual({
      q1: "required",
      q2: "required",
    });
    expect(errors(schema.safeParse({ q1: "a", q2: ["z"] }))).toEqual({ q2: "required" });
  });

  describe("normalized identifiers", () => {
    it("saves DNI and CUIL as digits, whatever was typed", () => {
      const result = personalSchema.safeParse({
        ...luciaPersonal,
        dni: "30.123.456",
        cuil: "27-30123456-8",
      });
      expect(result.success && result.data.dni).toBe("30123456");
      expect(result.success && result.data.cuil).toBe("27301234568");
    });
  });
});
