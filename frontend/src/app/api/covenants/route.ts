import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, authenticateRequest } from "@/lib/server/auth";
import { createCovenant, listCovenantsForUser } from "@/lib/server/covenants";
import { readJson, createCovenantSchema } from "@/lib/server/validation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withApi(async () => {
    const session = await authenticateRequest(request);
    return NextResponse.json(await listCovenantsForUser(session.user));
  });
}

export async function POST(request: NextRequest) {
  return withApi(async () => {
    assertCsrf(request);
    const session = await authenticateRequest(request);
    const input = await readJson(request, createCovenantSchema);
    return NextResponse.json(await createCovenant(session.user, input));
  });
}
