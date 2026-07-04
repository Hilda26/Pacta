import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getAddress, verifyMessage } from "viem";
import { badRequest, unauthorized } from "./errors";
import { mapUser } from "./mappers";
import { recordAudit } from "./audit";
import { ensure, supabaseAdmin, throwIfError } from "./supabase";

const SESSION_COOKIE = "pacta_session";
const CSRF_COOKIE = "pacta_csrf";
const SESSION_DAYS = 7;

type WalletNonceRow = {
  id: string;
  wallet_address: string;
  nonce: string;
  expires_at: string;
  consumed_at: string | null;
};

export type AuthenticatedUser = {
  id: string;
  walletAddress: string;
  displayName: string | null;
};

export async function createNonce(request: NextRequest, walletAddress: string) {
  const normalizedWalletAddress = getAddress(walletAddress);
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + Number(process.env.WALLET_NONCE_TTL_SECONDS ?? 300) * 1000);
  const message = buildSignInMessage(normalizedWalletAddress, nonce, requestOrigin(request));

  const { error } = await supabaseAdmin().from("wallet_nonces").insert({
    wallet_address: normalizedWalletAddress,
    nonce,
    expires_at: expiresAt.toISOString()
  });
  throwIfError(error, "Create wallet nonce");

  await recordAudit({
    action: "auth.nonce.created",
    target: normalizedWalletAddress,
    metadata: { expiresAt: expiresAt.toISOString() }
  });

  return { nonce, message, expiresAt: expiresAt.toISOString() };
}

export async function verifyWalletSignature(
  request: NextRequest,
  input: { walletAddress: string; nonce: string; signature: string }
) {
  const normalizedWalletAddress = getAddress(input.walletAddress);
  const { data, error } = await supabaseAdmin()
    .from("wallet_nonces")
    .select("*")
    .eq("nonce", input.nonce)
    .maybeSingle<WalletNonceRow>();
  throwIfError(error, "Read wallet nonce");

  if (!data || data.wallet_address !== normalizedWalletAddress) {
    throw unauthorized("Invalid wallet nonce.");
  }

  if (data.consumed_at || new Date(data.expires_at).getTime() <= Date.now()) {
    throw unauthorized("Wallet nonce is expired or already consumed.");
  }

  const validSignature = await verifyMessage({
    address: normalizedWalletAddress,
    message: buildSignInMessage(normalizedWalletAddress, input.nonce, requestOrigin(request)),
    signature: input.signature as `0x${string}`
  });

  if (!validSignature) {
    throw unauthorized("Invalid wallet signature.");
  }

  const user = await findOrCreateUser(normalizedWalletAddress);
  const sessionToken = randomBytes(48).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS);

  const { error: rpcError } = await supabaseAdmin().rpc("pacta_consume_wallet_nonce_and_create_session", {
    p_nonce_id: data.id,
    p_user_id: user.id,
    p_token_hash: hashSessionToken(sessionToken),
    p_expires_at: expiresAt.toISOString()
  });
  throwIfError(rpcError, "Create authenticated session");

  await recordAudit({
    actorId: user.id,
    action: "auth.wallet.verified",
    target: normalizedWalletAddress
  });

  return {
    sessionToken,
    csrfToken,
    expiresAt,
    user: toAuthenticatedUser(user)
  };
}

export async function authenticateRequest(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    throw unauthorized("Missing session.");
  }

  const { data, error } = await supabaseAdmin()
    .from("sessions")
    .select("*, user:users(*)")
    .eq("token_hash", hashSessionToken(sessionToken))
    .maybeSingle();
  throwIfError(error, "Authenticate session");

  if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
    throw unauthorized("Invalid or expired session.");
  }

  return {
    sessionToken,
    user: toAuthenticatedUser(mapUser(data.user))
  };
}

export function assertCsrf(request: NextRequest) {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-pacta-csrf");
  if (!cookieToken || !headerToken) {
    throw unauthorized("Missing CSRF token.");
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
    throw unauthorized("Invalid CSRF token.");
  }
}

export async function logout(sessionToken: string | undefined) {
  if (!sessionToken) {
    throw badRequest("Missing session.");
  }
  const { error } = await supabaseAdmin().from("sessions").delete().eq("token_hash", hashSessionToken(sessionToken));
  throwIfError(error, "Logout session");
}

export function setSessionCookies(
  response: NextResponse,
  input: { sessionToken: string; csrfToken: string; expiresAt: Date },
  request: NextRequest
) {
  const secure = requestOrigin(request).startsWith("https://") || process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, input.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: input.expiresAt
  });
  response.cookies.set(CSRF_COOKIE, input.csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    expires: input.expiresAt
  });
}

export function expireSessionCookies(response: NextResponse, request: NextRequest) {
  const secure = requestOrigin(request).startsWith("https://") || process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0)
  });
  response.cookies.set(CSRF_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0)
  });
}

async function findOrCreateUser(walletAddress: string) {
  const normalizedWalletAddress = getAddress(walletAddress);
  const { data, error } = await supabaseAdmin()
    .from("users")
    .upsert({ wallet_address: normalizedWalletAddress }, { onConflict: "wallet_address" })
    .select("*")
    .single();
  return mapUser(ensure(data, error, "Find or create user"));
}

function buildSignInMessage(walletAddress: string, nonce: string, domain: string) {
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

function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return process.env.APP_URL ?? "http://localhost:3000";
}

function toAuthenticatedUser(user: { id: string; walletAddress: string; displayName: string | null }): AuthenticatedUser {
  return {
    id: user.id,
    walletAddress: user.walletAddress,
    displayName: user.displayName
  };
}
