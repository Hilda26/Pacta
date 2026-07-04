import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, authenticateRequest } from "@/lib/server/auth";
import { linkCovenantContract } from "@/lib/server/covenants";
import { linkContractSchema, readJson } from "@/lib/server/validation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return withApi(async () => {
    assertCsrf(request);
    const { id } = await context.params;
    const session = await authenticateRequest(request);
    const input = await readJson(request, linkContractSchema);
    return NextResponse.json(await linkCovenantContract(session.user, id, input));
  });
}
