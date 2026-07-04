import { NextRequest, NextResponse } from "next/server";
import { createNonce } from "@/lib/server/auth";
import { readJson, createNonceSchema } from "@/lib/server/validation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return withApi(async () => {
    const input = await readJson(request, createNonceSchema);
    return NextResponse.json(await createNonce(request, input.walletAddress));
  });
}
