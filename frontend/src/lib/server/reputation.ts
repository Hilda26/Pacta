import { getAddress } from "viem";
import { mapPublicCovenant, mapReputationEvent, mapUser } from "./mappers";
import { notFound } from "./errors";
import { ensureArray, supabaseAdmin, throwIfError } from "./supabase";

type ReputationEventSummary = {
  delta: number;
  eventType: string;
};

export async function getPublicReputationProfile(walletAddress: string) {
  const normalizedWalletAddress = getAddress(walletAddress);
  const { data: userRow, error: userError } = await supabaseAdmin()
    .from("users")
    .select("*")
    .eq("wallet_address", normalizedWalletAddress)
    .maybeSingle();
  throwIfError(userError, "Read reputation user");

  if (!userRow) {
    throw notFound("Reputation profile not found.");
  }

  const user = mapUser(userRow);
  const { data: eventRows, error: eventError } = await supabaseAdmin()
    .from("reputation_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const recentEvents = ensureArray(eventRows, eventError, "Read reputation events").map(mapReputationEvent);

  const { data: covenantRows, error: covenantError } = await supabaseAdmin()
    .from("covenants")
    .select("id,title,status,deadline_at,created_at")
    .eq("creator_id", user.id)
    .eq("privacy", "PUBLIC")
    .order("created_at", { ascending: false })
    .limit(20);
  const publicCovenants = ensureArray(covenantRows, covenantError, "Read public covenants").map(mapPublicCovenant);

  const reputationEvents = recentEvents as ReputationEventSummary[];
  const rawScore = 700 + reputationEvents.reduce((sum, event) => sum + event.delta, 0);
  const score = Math.max(0, Math.min(1000, rawScore));

  return {
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName
    },
    score,
    stats: {
      fulfilled: reputationEvents.filter((event) => event.eventType === "COVENANT_FULFILLED").length,
      partiallyFulfilled: reputationEvents.filter((event) => event.eventType === "COVENANT_PARTIALLY_FULFILLED").length,
      broken: reputationEvents.filter((event) => event.eventType === "COVENANT_BROKEN").length
    },
    recentEvents,
    publicCovenants
  };
}
