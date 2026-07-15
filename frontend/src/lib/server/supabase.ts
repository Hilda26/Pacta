import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { HttpError, serviceUnavailable } from "./errors";
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
  throwIfError(error, context);
  if (data === null) {
    throw new HttpError(500, `${context}: empty response`);
  }
  return data;
}

export function ensureArray<T>(data: T[] | null, error: { message: string } | null, context: string): T[] {
  throwIfError(error, context);
  return data ?? [];
}

export function throwIfError(error: { message: string } | null, context: string) {
  if (!error) {
    return;
  }

  if (isSupabaseNetworkFailure(error.message)) {
    throw serviceUnavailable(
      "Pacta could not reach its Supabase backend. Confirm the Supabase project is active and SUPABASE_URL points to a reachable project URL."
    );
  }

  throw new HttpError(500, `${context}: ${error.message}`);
}

function isSupabaseNetworkFailure(message: string) {
  return /fetch failed|failed to fetch|network|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(message);
}
