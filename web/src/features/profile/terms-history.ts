import type { TermsDocument } from "@/api/proposed-types";

export interface AcceptedTermsRow {
  id: string;
  title: string;
  url: string;
  version: string;
  acceptedAt: string;
}

// One line per document and accepted version, most recent first. A republished document keeps
// the record of what the client accepted before (api-gaps.md, item 10). Ties keep the API order.
export function acceptedTermsRows(docs: readonly TermsDocument[]): AcceptedTermsRow[] {
  const rows = docs.flatMap((doc) => {
    const versions = new Map((doc.acceptances ?? []).map((a) => [a.version, a.acceptedAt]));
    if (doc.acceptedAt) versions.set(doc.version, doc.acceptedAt);
    return [...versions].map(([version, acceptedAt]) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      version,
      acceptedAt,
    }));
  });
  return rows.sort((a, b) => Date.parse(b.acceptedAt) - Date.parse(a.acceptedAt));
}

// The version in force still waiting for acceptance (the acceptance itself happens in T11).
export function pendingTerms(docs: readonly TermsDocument[]): TermsDocument[] {
  return docs.filter((doc) => !doc.acceptedAt);
}
