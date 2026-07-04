import { NextResponse } from "next/server";
import { getPublicGenLayerConfig } from "@/lib/server/genlayer";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function GET() {
  return withApi(async () => NextResponse.json(getPublicGenLayerConfig()));
}
