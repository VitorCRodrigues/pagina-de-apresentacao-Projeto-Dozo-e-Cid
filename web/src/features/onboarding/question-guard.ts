// The client draws only what it knows. Anything else (a new kind, a question without
// options) makes the step show the error state instead of a broken or invented question.
// Typed loosely on purpose: production does not validate API responses (only dev and tests).
export function canRender(question: { kind: string; options?: readonly unknown[] }): boolean {
  return (
    (question.kind === "single" || question.kind === "multi") &&
    Array.isArray(question.options) &&
    question.options.length > 0
  );
}
