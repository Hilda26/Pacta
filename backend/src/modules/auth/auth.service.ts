import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { getAddress, verifyMessage } from "viem";
import { AuditService } from "../audit/audit.service";
import { mapUser } from "../database/record-mappers";
import { SupabaseService } from "../database/supabase.service";
import { UsersService } from "../users/users.service";
import { VerifyWalletDto } from "./dto/verify-wallet.dto";

export type AuthenticatedUser = {
  id: string;
  walletAddress: string;
  displayName: string | null;
};

type WalletNonceRow = {
  id: string;
  wallet_address: string;
  nonce: string;
  expires_at: string;
  consumed_at: string | null;
};

@Injectable()
export class AuthService {
  private readonly sessionCookieName = "pacta_session";
  private readonly csrfCookieName = "pacta_csrf";

  constructor(
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly db: SupabaseService,
    private readonly users: UsersService
  ) {}

  async createNonce(walletAddress: string) {
    const normalizedWalletAddress = getAddress(walletAddress);
    const nonce = randomBytes(32).toString("hex");
    const ttlSeconds = Number(this.config.get<string>("WALLET_NONCE_TTL_SECONDS") ?? 300);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const domain = this.config.get<string>("APP_URL") ?? "http://localhost:3000";
    const message = this.buildSignInMessage(normalizedWalletAddress, nonce, domain);

    const { error } = await this.db.admin.from("wallet_nonces").insert({
      wallet_address: normalizedWalletAddress,
      nonce,
      expires_at: expiresAt.toISOString()
    });
    this.db.throwIfError(error, "Create wallet nonce");

    await this.audit.record({
      action: "auth.nonce.created",
      target: normalizedWalletAddress,
      metadata: { expiresAt: expiresAt.toISOString() }
    });

    return { nonce, message, expiresAt: expiresAt.toISOString() };
  }

  async verifyWalletSignature(dto: VerifyWalletDto) {
    const normalizedWalletAddress = getAddress(dto.walletAddress);
    const { data, error } = await this.db.admin
      .from("wallet_nonces")
      .select("*")
      .eq("nonce", dto.nonce)
      .maybeSingle<WalletNonceRow>();
    this.db.throwIfError(error, "Read wallet nonce");

    if (!data || data.wallet_address !== normalizedWalletAddress) {
      throw new UnauthorizedException("Invalid wallet nonce.");
    }

    if (data.consumed_at || new Date(data.expires_at).getTime() <= Date.now()) {
      throw new UnauthorizedException("Wallet nonce is expired or already consumed.");
    }

    const domain = this.config.get<string>("APP_URL") ?? "http://localhost:3000";
    const message = this.buildSignInMessage(normalizedWalletAddress, dto.nonce, domain);
    const validSignature = await verifyMessage({
      address: normalizedWalletAddress,
      message,
      signature: dto.signature as `0x${string}`
    });

    if (!validSignature) {
      throw new UnauthorizedException("Invalid wallet signature.");
    }

    const user = await this.users.findOrCreateByWalletAddress(normalizedWalletAddress);
    const sessionToken = randomBytes(48).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const tokenHash = this.hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const { error: rpcError } = await this.db.admin.rpc("pacta_consume_wallet_nonce_and_create_session", {
      p_nonce_id: data.id,
      p_user_id: user.id,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt.toISOString()
    });
    this.db.throwIfError(rpcError, "Create authenticated session");

    await this.audit.record({
      actorId: user.id,
      action: "auth.wallet.verified",
      target: normalizedWalletAddress
    });

    return {
      sessionToken,
      csrfToken,
      expiresAt,
      user: this.toAuthenticatedUser(user)
    };
  }

  async authenticateSession(sessionToken: string | undefined): Promise<AuthenticatedUser> {
    if (!sessionToken) {
      throw new UnauthorizedException("Missing session.");
    }

    const { data, error } = await this.db.admin
      .from("sessions")
      .select("*, user:users(*)")
      .eq("token_hash", this.hashSessionToken(sessionToken))
      .maybeSingle();
    this.db.throwIfError(error, "Authenticate session");

    if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
      throw new UnauthorizedException("Invalid or expired session.");
    }

    return this.toAuthenticatedUser(mapUser(data.user));
  }

  async logout(sessionToken: string | undefined) {
    if (!sessionToken) {
      throw new BadRequestException("Missing session.");
    }

    const { error } = await this.db.admin.from("sessions").delete().eq("token_hash", this.hashSessionToken(sessionToken));
    this.db.throwIfError(error, "Logout session");
  }

  extractSessionToken(request: any): string | undefined {
    return this.readCookie(request.headers?.cookie, this.sessionCookieName);
  }

  buildSessionCookies(sessionToken: string, csrfToken: string, expiresAt: Date) {
    const expires = expiresAt.toUTCString();
    const secure = this.secureCookieAttribute();

    return [
      `${this.sessionCookieName}=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax;${secure} Expires=${expires}`,
      `${this.csrfCookieName}=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax;${secure} Expires=${expires}`
    ];
  }

  buildExpiredSessionCookies() {
    const secure = this.secureCookieAttribute();
    return [
      `${this.sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax;${secure} Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `${this.csrfCookieName}=; Path=/; SameSite=Lax;${secure} Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    ];
  }

  private buildSignInMessage(walletAddress: string, nonce: string, domain: string) {
    return [
      "Sign in to Pacta.",
      "",
      `Wallet: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `Domain: ${domain}`,
      "",
      "Only sign this message if you trust the Pacta application."
    ].join("\n");
  }

  private hashSessionToken(sessionToken: string) {
    return createHash("sha256").update(sessionToken).digest("hex");
  }

  private readCookie(cookieHeader: unknown, name: string) {
    if (typeof cookieHeader !== "string") {
      return undefined;
    }

    const cookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
  }

  private secureCookieAttribute() {
    return this.config.get<string>("NODE_ENV") === "production" ? " Secure;" : "";
  }

  private toAuthenticatedUser(user: { id: string; walletAddress: string; displayName: string | null }): AuthenticatedUser {
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName
    };
  }
}
