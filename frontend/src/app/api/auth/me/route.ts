import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withApi(async () => {
    const session = await authenticateRequest(request);
    return NextResponse.json({ user: session.user });
  });
}
