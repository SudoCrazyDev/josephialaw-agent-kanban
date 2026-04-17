/**
 * Placeholder. Regenerate with `supabase gen types typescript --schema kanban`
 * (or the Supabase CLI's `db:types` script) after applying migrations.
 *
 * Shape is intentionally loose so Supabase client `db: { schema }` option
 * accepts any schema name until real generated types land.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AnyTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: never[];
};

type AnySchema = {
  Tables: Record<string, AnyTable>;
  Views: Record<string, AnyTable>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};

export type Database = {
  kanban: AnySchema;
  public: AnySchema;
};
