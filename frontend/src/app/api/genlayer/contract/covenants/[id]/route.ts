import { NextResponse } from "next/server";
import { readJsonContractView } from "@/lib/server/genlayer";
import { withApi } from "@/lib/server/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return withApi(async () => {
    const { id } = await context.params;
    return NextResponse.json(await readJsonContractView("get_covenant", [id]));
  });
}
