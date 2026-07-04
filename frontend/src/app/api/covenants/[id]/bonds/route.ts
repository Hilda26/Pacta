import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, authenticateRequest } from "@/lib/server/auth";
import { createBond, listBonds } from "@/lib/server/bonds";
import { readJson, createBondSchema } from "@/lib/server/validation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withApi(async () => {
    const { id } = await context.params;
    const session = await authenticateRequest(request);
    return NextResponse.json(await listBonds(session.user, id));
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withApi(async () => {
    assertCsrf(request);
    const { id } = await context.params;
    const session = await authenticateRequest(request);
    const input = await readJson(request, createBondSchema);
    return NextResponse.json(await createBond(session.user, id, input));
  });
}
