import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./errors";
import { requiredEnv } from "./env";

let cachedClient: SupabaseClient | undefined;

export function supabaseAdmin() {
  if (!cachedClient) {
    cachedClient = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return cachedClient;
}

export function ensure<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) {
    throw new HttpError(500, `${context}: ${error.message}`);
  }
  if (data === null) {
    throw new HttpError(500, `${context}: empty response`);
  }
  return data;
}

export function ensureArray<T>(data: T[] | null, error: { message: string } | null, context: string): T[] {
  if (error) {
    throw new HttpError(500, `${context}: ${error.message}`);
  }
  return data ?? [];
}

export function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new HttpError(500, `${context}: ${error.message}`);
  }
}
