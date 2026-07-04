import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { getCovenantForUser } from "@/lib/server/covenants";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withApi(async () => {
    const { id } = await context.params;
    const session = await authenticateRequest(request);
    return NextResponse.json(await getCovenantForUser(session.user, id));
  });
}
