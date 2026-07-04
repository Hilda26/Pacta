import { Injectable, NotFoundException } from "@nestjs/common";
import { getAddress } from "viem";
import { mapPublicCovenant, mapReputationEvent, mapUser } from "../database/record-mappers";
import { SupabaseService } from "../database/supabase.service";

type ReputationEventSummary = {
  delta: number;
  eventType: string;
};

@Injectable()
export class ReputationService {
  constructor(private readonly db: SupabaseService) {}

  async getPublicProfile(walletAddress: string) {
    const normalizedWalletAddress = getAddress(walletAddress);
    const { data: userRow, error: userError } = await this.db.admin
      .from("users")
      .select("*")
      .eq("wallet_address", normalizedWalletAddress)
      .maybeSingle();
    this.db.throwIfError(userError, "Read reputation user");

    if (!userRow) {
      throw new NotFoundException("Reputation profile not found.");
    }

    const user = mapUser(userRow);
    const { data: eventRows, error: eventError } = await this.db.admin
      .from("reputation_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const recentEvents = this.db.ensureArray(eventRows, eventError, "Read reputation events").map(mapReputationEvent);

    const { data: covenantRows, error: covenantError } = await this.db.admin
      .from("covenants")
      .select("id,title,status,deadline_at,created_at")
      .eq("creator_id", user.id)
      .eq("privacy", "PUBLIC")
      .order("created_at", { ascending: false })
      .limit(20);
    const publicCovenants = this.db.ensureArray(covenantRows, covenantError, "Read public covenants").map(mapPublicCovenant);

    const reputationEvents = recentEvents as ReputationEventSummary[];
    const rawScore = 700 + reputationEvents.reduce((sum: number, event: ReputationEventSummary) => sum + event.delta, 0);
    const score = Math.max(0, Math.min(1000, rawScore));

    return {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName
      },
      score,
      stats: {
        fulfilled: reputationEvents.filter((event: ReputationEventSummary) => event.eventType === "COVENANT_FULFILLED").length,
        partiallyFulfilled: reputationEvents.filter(
          (event: ReputationEventSummary) => event.eventType === "COVENANT_PARTIALLY_FULFILLED"
        ).length,
        broken: reputationEvents.filter((event: ReputationEventSummary) => event.eventType === "COVENANT_BROKEN").length
      },
      recentEvents,
      publicCovenants
    };
  }
}
