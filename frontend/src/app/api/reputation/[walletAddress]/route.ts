import { NextResponse } from "next/server";
import { getPublicReputationProfile } from "@/lib/server/reputation";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ walletAddress: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return withApi(async () => {
    const { walletAddress } = await context.params;
    return NextResponse.json(await getPublicReputationProfile(walletAddress));
  });
}
