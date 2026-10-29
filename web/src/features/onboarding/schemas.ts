import { z } from "zod";
import type { Questionnaire, TermsAcceptance, TermsDocument } from "@/api/proposed-types";
import { isAtLeastAge } from "@/lib/age";
import { isValidCuit, normalizeCuit } from "@/lib/cuit";
import { fundSources, occupations, provinceCodes } from "./countries";

// One schema per onboarding step (PRD T2). Messages are error codes; screens translate them
// with onboarding.errors.<code>. The same schemas can be shared with the backend.

export type ErrorCode =
  | "required"
  | "invalidName"
  | "nameTwoWords"
  | "invalidDate"
  | "underage"
  | "invalidDni"
  | "invalidCuit"
  | "cuitCheckDigit"
  | "cuitDniMismatch"
  | "invalidEmail"
  | "invalidPhone"
  | "invalidPostalCode"
  | "termsRequired"
  | "identityRequired";

const err = (code: ErrorCode) => ({ error: code });
const required = z.string(err("required")).trim().min(1, err("required"));
const isoCountry = z.string(err("required")).regex(/^[A-Z]{2}$/, err("required"));

export const residenceSchema = z.object({ country: isoCountry, nationality: isoCountry });

// Letters (any script, accents, ñ), separated by spaces, an apostrophe or a hyphen.
const NAME = /^\p{L}+(?:(?:\s+|['-])\p{L}+)*$/u;
const MIN_AGE = 18;
const MAX_AGE = 120;

const dniDigits = (dni: string) => dni.replace(/\./g, "").trim();

export const personalSchema = z
  .object({
    fullName: required
      .regex(NAME, err("invalidName"))
      .refine((name) => name.split(/\s+/).length >= 2, err("nameTwoWords")),
    birthDate: z.string(err("required")).superRefine((date, ctx) => {
      // isAtLeastAge(date, 0) is false for malformed, impossible and future dates.
      if (!isAtLeastAge(date, 0) || isAtLeastAge(date, MAX_AGE + 1)) {
        ctx.addIssue({ code: "custom", message: "invalidDate" });
      } else if (!isAtLeastAge(date, MIN_AGE)) {
        ctx.addIssue({ code: "custom", message: "underage" });
      }
    }),
    // Saved as digits only, whatever punctuation was typed.
    dni: z
      .string(err("required"))
      .refine((dni) => /^\d{7,8}$/.test(dniDigits(dni)), err("invalidDni"))
      .transform(dniDigits),
    cuil: z
      .string(err("required"))
      .superRefine((cuil, ctx) => {
        if (!/^\d{11}$/.test(normalizeCuit(cuil))) {
          ctx.addIssue({ code: "custom", message: "invalidCuit" });
        } else if (!isValidCuit(cuil)) {
          ctx.addIssue({ code: "custom", message: "cuitCheckDigit" });
        }
      })
      .transform(normalizeCuit),
    email: z.email(err("invalidEmail")),
    phone: z
      .string(err("required"))
      .refine(
        (phone) => /^\+?[\d\s()-]+$/.test(phone) && /^\d{8,15}$/.test(phone.replace(/\D/g, "")),
        err("invalidPhone"),
      ),
  })
  .superRefine(({ dni, cuil }, ctx) => {
    // A CUIL carries the DNI in digits 3–10: a valid CUIL of someone else is still wrong.
    const digits = dniDigits(dni);
    if (!/^\d{7,8}$/.test(digits) || !isValidCuit(cuil)) return;
    if (normalizeCuit(cuil).slice(2, 10) !== digits.padStart(8, "0")) {
      ctx.addIssue({ code: "custom", path: ["cuil"], message: "cuitDniMismatch" });
    }
  });

export const addressSchema = z.object({
  street: required,
  unit: z.string().trim().optional(),
  city: required,
  province: z.enum(provinceCodes, err("required")),
  // CPA (C1043AAZ) or the older 4-digit code.
  postalCode: required.regex(/^(?:[A-Za-z]\d{4}[A-Za-z]{3}|\d{4})$/, err("invalidPostalCode")),
});

export const fundsSchema = z
  .object({
    occupation: z.enum(occupations, err("required")),
    sourceOfFunds: z.enum(fundSources, err("required")),
    isPep: z.boolean(err("required")),
    pepRole: z.string().trim().optional(),
  })
  .superRefine(({ isPep, pepRole }, ctx) => {
    if (isPep && !pepRole) ctx.addIssue({ code: "custom", path: ["pepRole"], message: "required" });
  });

export const identitySchema = z.object({
  status: z.literal("approved", err("identityRequired")),
  reference: z.string(err("identityRequired")).min(1, err("identityRequired")),
});

// One checkbox per document. Its value is when it was ticked ("" while unticked), so the
// time survives Volver and Continuar; the draft stores id, version and acceptedAt.
export function termsSchema(docs: readonly TermsDocument[]) {
  return z.object({
    checked: z.object(
      Object.fromEntries(
        docs.map((doc) => [doc.id, z.string(err("termsRequired")).min(1, err("termsRequired"))]),
      ),
    ),
  });
}

const termsDraftSchema = z.object({
  accepted: z.array(z.object({ id: z.string(), version: z.string(), acceptedAt: z.string() })),
});

export function toTermsDraft(
  docs: readonly TermsDocument[],
  acceptedAt: Record<string, string>,
): { accepted: TermsAcceptance[] } {
  return {
    accepted: docs.flatMap((doc) => {
      const at = acceptedAt[doc.id];
      return at ? [{ id: doc.id, version: doc.version, acceptedAt: at }] : [];
    }),
  };
}

// Acceptances still valid for the current versions; a new version must be accepted again.
export function termsFromDraft(
  docs: readonly TermsDocument[],
  draft: unknown,
): Record<string, string> {
  const parsed = termsDraftSchema.safeParse(draft);
  if (!parsed.success) return {};
  const current = new Map(docs.map((doc) => [doc.id, doc.version]));
  return Object.fromEntries(
    parsed.data.accepted
      .filter((item) => current.get(item.id) === item.version)
      .map((item) => [item.id, item.acceptedAt]),
  );
}

// Built from the API questionnaire: nothing about the questions is fixed in the client.
export function questionnaireAnswersSchema(questionnaire: Questionnaire) {
  return z.object(
    Object.fromEntries(
      questionnaire.questions.map((question) => {
        const values = new Set(question.options.map((option) => option.value));
        const schema =
          question.kind === "single"
            ? z.string(err("required")).refine((value) => values.has(value), err("required"))
            : z
                .array(z.string(), err("required"))
                .refine(
                  (picked) => picked.length > 0 && picked.every((value) => values.has(value)),
                  err("required"),
                );
        return [question.id, schema];
      }),
    ),
  );
}

export type ResidenceForm = z.infer<typeof residenceSchema>;
export type PersonalForm = z.infer<typeof personalSchema>;
export type AddressForm = z.infer<typeof addressSchema>;
export type FundsForm = z.infer<typeof fundsSchema>;
export type IdentityData = z.infer<typeof identitySchema>;
export type QuestionnaireAnswers = Record<string, string | string[]>;
