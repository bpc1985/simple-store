"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

// ponytail: minimal form context, no field-level tracking needed for this admin panel
type FormContextValue = { errors: Record<string, string | undefined> };
const FormContext = React.createContext<FormContextValue>({ errors: {} });

export function useFormField() {
  const ctx = React.useContext(FormContext);
  return ctx;
}

function FormRoot({
  errors = {},
  children,
}: {
  errors: Record<string, string | undefined>;
  children: React.ReactNode;
}) {
  return (
    <FormContext.Provider value={{ errors }}>
      <div className="space-y-4">{children}</div>
    </FormContext.Provider>
  );
}

function FormField({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FormLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </Label>
  );
}

function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function FormMessage({ name }: { name: string }) {
  const { errors } = React.useContext(FormContext);
  const error = errors[name];
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

export { FormRoot, FormField, FormLabel, FormControl, FormMessage };
