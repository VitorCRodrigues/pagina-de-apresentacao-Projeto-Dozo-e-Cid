import { createContext, useContext } from "react";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export const FieldContext = createContext<FieldControlProps | null>(null);

// Controls (Input, Select) read their id and ARIA wiring from the surrounding Field.
export function useFieldControl(): FieldControlProps | null {
  return useContext(FieldContext);
}
