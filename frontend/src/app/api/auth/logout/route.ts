import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, authenticateRequest, expireSessionCookies, logout } from "@/lib/server/auth";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return withApi(async () => {
    assertCsrf(request);
    const session = await authenticateRequest(request);
    await logout(session.sessionToken);
    const response = NextResponse.json({ ok: true });
    expireSessionCookies(response, request);
    return response;
  });
}
