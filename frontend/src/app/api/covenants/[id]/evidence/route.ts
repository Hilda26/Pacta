import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, authenticateRequest } from "@/lib/server/auth";
import { createEvidence, listEvidence } from "@/lib/server/evidence";
import { readJson, createEvidenceSchema } from "@/lib/server/validation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withApi(async () => {
    const { id } = await context.params;
    const session = await authenticateRequest(request);
    return NextResponse.json(await listEvidence(session.user, id));
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withApi(async () => {
    assertCsrf(request);
    const { id } = await context.params;
    const session = await authenticateRequest(request);
    const input = await readJson(request, createEvidenceSchema);
    return NextResponse.json(await createEvidence(session.user, id, input));
  });
}
