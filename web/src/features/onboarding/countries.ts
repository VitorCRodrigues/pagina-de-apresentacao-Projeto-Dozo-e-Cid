// TODO(decisão): short list of countries for residence and nationality; names come from
// Intl.DisplayNames in the client's language. Anything outside liveMarkets goes to the waitlist.
export const countryCodes = [
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "DE",
  "EC",
  "ES",
  "FR",
  "GB",
  "IT",
  "MX",
  "PA",
  "PE",
  "PT",
  "PY",
  "US",
  "UY",
  "VE",
] as const;

// ISO 3166-2:AR. Proper names, not translated.
export const provinces = {
  C: "Ciudad Autónoma de Buenos Aires",
  B: "Buenos Aires",
  K: "Catamarca",
  H: "Chaco",
  U: "Chubut",
  X: "Córdoba",
  W: "Corrientes",
  E: "Entre Ríos",
  P: "Formosa",
  Y: "Jujuy",
  L: "La Pampa",
  F: "La Rioja",
  M: "Mendoza",
  N: "Misiones",
  Q: "Neuquén",
  R: "Río Negro",
  A: "Salta",
  J: "San Juan",
  D: "San Luis",
  Z: "Santa Cruz",
  S: "Santa Fe",
  G: "Santiago del Estero",
  V: "Tierra del Fuego",
  T: "Tucumán",
} as const;

export type ProvinceCode = keyof typeof provinces;
export const provinceCodes = Object.keys(provinces) as [ProvinceCode, ...ProvinceCode[]];

// Codes for onboarding step 5; labels live in i18n. TODO(compliance): lists to be reviewed.
export const occupations = [
  "employee",
  "self_employed",
  "business_owner",
  "retired",
  "student",
  "other",
] as const;

export const fundSources = [
  "salary",
  "business",
  "savings",
  "investments",
  "inheritance",
  "property_sale",
  "other",
] as const;

// Country names in the client's language, sorted for a picker.
export function countryOptions(intlLocale: string): { value: string; label: string }[] {
  const names = new Intl.DisplayNames([intlLocale], { type: "region" });
  return countryCodes
    .map((code) => ({ value: code, label: names.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, intlLocale));
}

export function countryName(code: string, intlLocale: string): string {
  return new Intl.DisplayNames([intlLocale], { type: "region" }).of(code) ?? code;
}
