import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET() {
  const dependencies = {
    supabase: await checkSupabase()
  };
  const healthy = dependencies.supabase.ok;

  return NextResponse.json(
    {
      ok: healthy,
      service: "pacta-web-api",
      dependencies
    },
    { status: healthy ? 200 : 503 }
  );
}

async function checkSupabase() {
  try {
    const { error } = await supabaseAdmin().from("users").select("id", { head: true, count: "exact" }).limit(1);
    if (error) {
      return { ok: false, message: normalizeHealthError(error.message) };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: normalizeHealthError(error instanceof Error ? error.message : String(error)) };
  }
}

function normalizeHealthError(message: string) {
  if (/fetch failed|failed to fetch|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return "Supabase is unreachable from the Pacta server.";
  }

  return message;
}
