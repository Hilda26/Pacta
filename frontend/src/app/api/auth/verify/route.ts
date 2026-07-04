import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies, verifyWalletSignature } from "@/lib/server/auth";
import { readJson, verifyWalletSchema } from "@/lib/server/validation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return withApi(async () => {
    const input = await readJson(request, verifyWalletSchema);
    const result = await verifyWalletSignature(request, input);
    const response = NextResponse.json({
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
      csrfToken: result.csrfToken
    });
    setSessionCookies(response, result, request);
    return response;
  });
}
