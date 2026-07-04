import { Injectable } from "@nestjs/common";
import { getAddress } from "viem";
import { mapUser } from "../database/record-mappers";
import { SupabaseService } from "../database/supabase.service";

@Injectable()
export class UsersService {
  constructor(private readonly db: SupabaseService) {}

  async findByWalletAddress(walletAddress: string) {
    const normalizedWalletAddress = getAddress(walletAddress);
    const { data, error } = await this.db.admin
      .from("users")
      .select("*")
      .eq("wallet_address", normalizedWalletAddress)
      .maybeSingle();

    this.db.throwIfError(error, "Find user by wallet");
    return data ? mapUser(data) : null;
  }

  async findOrCreateByWalletAddress(walletAddress: string) {
    const normalizedWalletAddress = getAddress(walletAddress);
    const { data, error } = await this.db.admin
      .from("users")
      .upsert({ wallet_address: normalizedWalletAddress }, { onConflict: "wallet_address" })
      .select("*")
      .single();

    return mapUser(this.db.ensure(data, error, "Find or create user"));
  }
}
