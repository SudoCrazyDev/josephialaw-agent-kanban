"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type JsonSchema = {
  type?: "object" | "string" | "integer" | "number" | "boolean" | "array";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  format?: string;
  minimum?: number;
  items?: JsonSchema;
  description?: string;
};

function humanizeKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function defaultForSchema(s: JsonSchema): unknown {
  if (s.type === "array") return [];
  if (s.type === "integer" || s.type === "number") return undefined;
  if (s.type === "boolean") return false;
  if (s.enum && s.enum.length > 0) return s.enum[0];
  return "";
}

export type FormFromSchemaHandle = {
  values: Record<string, unknown>;
};

export function useSchemaForm(schema: JsonSchema): {
  values: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
  reset: () => void;
} {
  const props = schema.properties ?? {};
  const initial: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) initial[k] = defaultForSchema(v);
  const [values, setValues] = useState(initial);
  return {
    values,
    setField: (k, v) => setValues((prev) => ({ ...prev, [k]: v })),
    reset: () => setValues(initial)
  };
}

export function FormFromSchema({
  schema,
  values,
  onChange
}: {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  if (Object.keys(props).length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
        This task type has no declared payload schema. Leave blank or edit raw JSON later.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(props).map(([key, sub]) => (
        <Field
          key={key}
          name={key}
          schema={sub}
          required={required.has(key)}
          value={values[key]}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  );
}

function Field({
  name,
  schema,
  required,
  value,
  onChange
}: {
  name: string;
  schema: JsonSchema;
  required: boolean;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = humanizeKey(name);
  const labelEl = (
    <Label htmlFor={name}>
      {label}
      {required && <span className="ml-1 text-rose-400">*</span>}
    </Label>
  );

  // Enum → select
  if (schema.enum) {
    return (
      <div className="space-y-1">
        {labelEl}
        <select
          id={name}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {schema.enum.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.type === "integer" || schema.type === "number") {
    return (
      <div className="space-y-1">
        {labelEl}
        <Input
          id={name}
          type="number"
          min={schema.minimum}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
    );
  }

  if (schema.type === "array" && schema.items?.type === "string") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1">
        {labelEl}
        <Input
          id={name}
          placeholder="comma-separated"
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      </div>
    );
  }

  // Long text heuristic: keys named message/description/body
  const longText = /message|description|body|notes?/i.test(name);
  const isUrl = schema.format === "uri";

  return (
    <div className="space-y-1">
      {labelEl}
      {longText ? (
        <Textarea
          id={name}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <Input
          id={name}
          type={isUrl ? "url" : "text"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
