import { neon } from "@neondatabase/serverless";
import { requireDatabaseUrl } from "@/lib/server/env";

type NeonSql = ReturnType<typeof neon>;

let cachedSql: NeonSql | undefined;

export function getNeonSql() {
  if (!cachedSql) {
    cachedSql = neon(requireDatabaseUrl());
  }

  return cachedSql;
}

export function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

export function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  return [];
}

export function toRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as Record<string, unknown>[];
}
