from __future__ import annotations

import json
import shutil
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def write_file(relative_path: str, content: str) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).lstrip("\n"), encoding="utf-8", newline="\n")
    print(f"wrote {relative_path}")


def remove_path(relative_path: str) -> None:
    path = ROOT / relative_path
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()
    print(f"removed {relative_path}")


def update_json(relative_path: str, mutator) -> None:
    path = ROOT / relative_path
    value = json.loads(path.read_text(encoding="utf-8"))
    mutator(value)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"updated {relative_path}")


def update_pnpm_workspace() -> None:
    path = ROOT / "pnpm-workspace.yaml"
    lines = path.read_text(encoding="utf-8").splitlines()
    blocked = {"  '@prisma/client': true", "  '@prisma/engines': true", "  prisma: true"}
    path.write_text("\n".join(line for line in lines if line not in blocked) + "\n", encoding="utf-8", newline="\n")
    print("updated pnpm-workspace.yaml")


def main() -> None:
    write_file(
        "backend/src/modules/database/supabase.service.ts",
        r'''
        import { createClient, SupabaseClient } from "@supabase/supabase-js";
        import { Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
        import { ConfigService } from "@nestjs/config";

        @Injectable()
        export class SupabaseService {
          readonly admin: SupabaseClient;

          constructor(private readonly config: ConfigService) {
            const url = this.required("SUPABASE_URL");
            const serviceRoleKey = this.required("SUPABASE_SERVICE_ROLE_KEY");

            this.admin = createClient(url, serviceRoleKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            });
          }

          required(name: string) {
            const value = this.config.get<string>(name);
            if (!value) {
              throw new ServiceUnavailableException(`${name} is not configured.`);
            }
            return value;
          }

          ensure<T>(data: T | null, error: { message: string } | null, context: string): T {
            if (error) {
              throw new InternalServerErrorException(`${context}: ${error.message}`);
            }
            if (data === null) {
              throw new InternalServerErrorException(`${context}: empty response`);
            }
            return data;
          }

          ensureArray<T>(data: T[] | null, error: { message: string } | null, context: string): T[] {
            if (error) {
              throw new InternalServerErrorException(`${context}: ${error.message}`);
            }
            return data ?? [];
          }

          throwIfError(error: { message: string } | null, context: string) {
            if (error) {
              throw new InternalServerErrorException(`${context}: ${error.message}`);
            }
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/database/record-mappers.ts",
        r'''
        type Row = Record<string, any>;

        export function mapUser(row: Row) {
          return {
            id: row.id,
            walletAddress: row.wallet_address,
            displayName: row.display_name ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        }

        export function mapParticipant(row: Row) {
          return {
            id: row.id,
            covenantId: row.covenant_id,
            walletAddress: row.wallet_address,
            role: row.role,
            createdAt: row.created_at
          };
        }

        export function mapEvidence(row: Row) {
          return {
            id: row.id,
            covenantId: row.covenant_id,
            type: row.type,
            storageUri: row.storage_uri ?? null,
            sourceUrl: row.source_url ?? null,
            contentHash: row.content_hash,
            structuredMetadata: row.structured_metadata ?? {},
            verificationStatus: row.verification_status,
            createdAt: row.created_at
          };
        }

        export function mapBond(row: Row) {
          const result: Row = {
            id: row.id,
            covenantId: row.covenant_id,
            userId: row.user_id,
            amount: String(row.amount),
            status: row.status,
            txHash: row.tx_hash ?? null,
            createdAt: row.created_at
          };
          if (row.user) {
            result.user = mapUser(row.user);
          }
          return result;
        }

        export function mapEvaluation(row: Row) {
          return {
            id: row.id,
            covenantId: row.covenant_id,
            outcome: row.outcome,
            confidence: row.confidence,
            reasoning: row.reasoning ?? {},
            bondDistribution: row.bond_distribution ?? {},
            reputationImpact: row.reputation_impact ?? {},
            contractTxHash: row.contract_tx_hash ?? null,
            createdAt: row.created_at
          };
        }

        export function mapReputationEvent(row: Row) {
          return {
            id: row.id,
            userId: row.user_id,
            eventType: row.event_type,
            delta: row.delta,
            metadata: row.metadata ?? {},
            createdAt: row.created_at
          };
        }

        export function mapCovenant(row: Row) {
          const evaluations = [...(row.evaluations ?? [])].sort((left: Row, right: Row) =>
            String(right.created_at).localeCompare(String(left.created_at))
          );

          return {
            id: row.id,
            contractCovenantId: row.contract_covenant_id ?? null,
            creatorId: row.creator_id,
            title: row.title,
            promise: row.promise,
            successCriteria: row.success_criteria,
            evidenceRequirements: row.evidence_requirements,
            deadlineAt: row.deadline_at,
            privacy: row.privacy,
            status: row.status,
            requiredBondAmount: String(row.required_bond_amount),
            metadata: row.metadata ?? {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            participants: (row.participants ?? []).map(mapParticipant),
            evidenceItems: (row.evidenceItems ?? []).map(mapEvidence),
            evaluations: evaluations.slice(0, 1).map(mapEvaluation),
            bondPositions: (row.bondPositions ?? []).map(mapBond)
          };
        }

        export function mapPublicCovenant(row: Row) {
          return {
            id: row.id,
            title: row.title,
            status: row.status,
            deadlineAt: row.deadline_at,
            createdAt: row.created_at
          };
        }
        ''',
    )

    write_file(
        "backend/src/modules/database/database.module.ts",
        r'''
        import { Global, Module } from "@nestjs/common";
        import { SupabaseService } from "./supabase.service";

        @Global()
        @Module({
          providers: [SupabaseService],
          exports: [SupabaseService]
        })
        export class DatabaseModule {}
        ''',
    )
    remove_path("backend/src/modules/database/prisma.service.ts")

    write_file(
        "backend/src/modules/users/users.service.ts",
        r'''
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
        ''',
    )

    write_file(
        "backend/src/modules/audit/audit.service.ts",
        r'''
        import { Injectable, Logger } from "@nestjs/common";
        import { SupabaseService } from "../database/supabase.service";

        type AuditRecord = {
          actorId?: string;
          action: string;
          target: string;
          metadata?: Record<string, unknown>;
        };

        @Injectable()
        export class AuditService {
          private readonly logger = new Logger(AuditService.name);

          constructor(private readonly db: SupabaseService) {}

          async record(event: AuditRecord) {
            try {
              const { error } = await this.db.admin.from("audit_logs").insert({
                actor_id: event.actorId ?? null,
                action: event.action,
                target: event.target,
                metadata: event.metadata ?? {}
              });
              this.db.throwIfError(error, "Persist audit log");
            } catch (error) {
              this.logger.error("Failed to persist audit log", error instanceof Error ? error.stack : String(error));
            }
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/auth/auth.service.ts",
        r'''
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
        ''',
    )

    write_file(
        "backend/src/modules/covenants/covenants.service.ts",
        r'''
        import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
        import { AuditService } from "../audit/audit.service";
        import { AuthenticatedUser } from "../auth/auth.service";
        import { mapCovenant } from "../database/record-mappers";
        import { SupabaseService } from "../database/supabase.service";
        import { CreateCovenantDto } from "./dto/create-covenant.dto";
        import { SubmitEvaluationDto } from "./dto/submit-evaluation.dto";

        const covenantSelect =
          "*, participants:covenant_participants(*), evidenceItems:evidence_items(*), evaluations:evaluations(*), bondPositions:bond_positions(*, user:users(id,wallet_address,display_name,created_at,updated_at))";

        @Injectable()
        export class CovenantsService {
          constructor(
            private readonly audit: AuditService,
            private readonly db: SupabaseService
          ) {}

          async create(user: AuthenticatedUser, dto: CreateCovenantDto) {
            const deadlineAt = new Date(dto.deadlineAt);
            if (Number.isNaN(deadlineAt.getTime()) || deadlineAt.getTime() <= Date.now()) {
              throw new BadRequestException("Covenant deadline must be in the future.");
            }

            const { data, error } = await this.db.admin.rpc("pacta_create_covenant_with_creator", {
              p_creator_id: user.id,
              p_wallet_address: user.walletAddress,
              p_title: dto.title,
              p_promise: dto.promise,
              p_success_criteria: dto.successCriteria,
              p_evidence_requirements: dto.evidenceRequirements,
              p_deadline_at: deadlineAt.toISOString(),
              p_privacy: dto.privacy,
              p_required_bond_amount: dto.requiredBondAmount,
              p_metadata: dto.metadata ?? {}
            });
            const covenantId = this.db.ensure(data as string | null, error, "Create covenant");
            const covenant = await this.findCovenant(covenantId);

            await this.audit.record({
              actorId: user.id,
              action: "covenant.created",
              target: covenant.id,
              metadata: { privacy: covenant.privacy, deadlineAt: covenant.deadlineAt }
            });

            return covenant;
          }

          async listForUser(user: AuthenticatedUser) {
            const { data: participantRows, error: participantError } = await this.db.admin
              .from("covenant_participants")
              .select("covenant_id")
              .eq("wallet_address", user.walletAddress);
            const covenantIds = this.db.ensureArray(participantRows, participantError, "List participant covenants").map(
              (row) => row.covenant_id
            );

            const filters = [`creator_id.eq.${user.id}`, "privacy.eq.PUBLIC"];
            if (covenantIds.length > 0) {
              filters.push(`id.in.(${covenantIds.join(",")})`);
            }

            const { data, error } = await this.db.admin
              .from("covenants")
              .select(covenantSelect)
              .or(filters.join(","))
              .order("created_at", { ascending: false });

            return this.db.ensureArray(data, error, "List covenants").map(mapCovenant);
          }

          async getForUser(user: AuthenticatedUser, id: string) {
            const covenant = await this.findViewableCovenant(user, id);
            return covenant;
          }

          async submitEvaluation(user: AuthenticatedUser, id: string, dto: SubmitEvaluationDto) {
            const covenant = await this.findCovenant(id);

            const canSubmit =
              covenant.creatorId === user.id ||
              covenant.participants.some((participant: { walletAddress: string }) => participant.walletAddress === user.walletAddress);

            if (!canSubmit) {
              throw new ForbiddenException("You cannot request evaluation for this covenant.");
            }

            if (["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED"].includes(covenant.status)) {
              throw new BadRequestException("This covenant already has a terminal outcome.");
            }

            if (covenant.evidenceItems.length === 0) {
              throw new BadRequestException("At least one evidence item is required before evaluation.");
            }

            if (covenant.bondPositions.length === 0) {
              throw new BadRequestException("At least one bond must be submitted before evaluation.");
            }

            const { error } = await this.db.admin
              .from("covenants")
              .update({
                status: "EVALUATION_PENDING",
                contract_covenant_id: dto.contractCovenantId ?? covenant.contractCovenantId
              })
              .eq("id", id);
            this.db.throwIfError(error, "Submit covenant evaluation");
            const updated = await this.findCovenant(id);

            await this.audit.record({
              actorId: user.id,
              action: "covenant.evaluation_requested",
              target: id,
              metadata: {
                reason: dto.reason,
                contractCovenantId: dto.contractCovenantId ?? covenant.contractCovenantId
              }
            });

            return updated;
          }

          private async findViewableCovenant(user: AuthenticatedUser, id: string) {
            const covenant = await this.findCovenant(id);
            const canView =
              covenant.creatorId === user.id ||
              covenant.privacy === "PUBLIC" ||
              covenant.participants.some((participant: { walletAddress: string }) => participant.walletAddress === user.walletAddress);

            if (!canView) {
              throw new ForbiddenException("You do not have access to this covenant.");
            }

            return covenant;
          }

          private async findCovenant(id: string) {
            const { data, error } = await this.db.admin.from("covenants").select(covenantSelect).eq("id", id).maybeSingle();
            this.db.throwIfError(error, "Find covenant");
            if (!data) {
              throw new NotFoundException("Covenant not found.");
            }
            return mapCovenant(data);
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/evidence/evidence.service.ts",
        r'''
        import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
        import { AuditService } from "../audit/audit.service";
        import { AuthenticatedUser } from "../auth/auth.service";
        import { mapEvidence } from "../database/record-mappers";
        import { SupabaseService } from "../database/supabase.service";
        import { StorageService } from "../storage/storage.service";
        import { CreateEvidenceDto, CreateEvidenceUploadUrlDto } from "./dto/create-evidence.dto";

        @Injectable()
        export class EvidenceService {
          constructor(
            private readonly audit: AuditService,
            private readonly db: SupabaseService,
            private readonly storage: StorageService
          ) {}

          async createUploadUrl(user: AuthenticatedUser, covenantId: string, dto: CreateEvidenceUploadUrlDto) {
            await this.assertCanSubmitEvidence(user, covenantId);
            const upload = await this.storage.createEvidenceUploadUrl({
              covenantId,
              filename: dto.filename,
              contentType: dto.contentType,
              contentLength: dto.contentLength,
              contentHash: dto.contentHash
            });

            await this.audit.record({
              actorId: user.id,
              action: "evidence.upload_url.created",
              target: covenantId,
              metadata: { storageUri: upload.storageUri, contentHash: dto.contentHash }
            });

            return upload;
          }

          async create(user: AuthenticatedUser, covenantId: string, dto: CreateEvidenceDto) {
            await this.assertCanSubmitEvidence(user, covenantId);

            if (!dto.storageUri && !dto.sourceUrl && Object.keys(dto.structuredMetadata ?? {}).length === 0) {
              throw new BadRequestException("Evidence requires a storage URI, source URL, or structured metadata.");
            }

            const { data, error } = await this.db.admin.rpc("pacta_create_evidence_item", {
              p_covenant_id: covenantId,
              p_type: dto.type,
              p_storage_uri: dto.storageUri ?? null,
              p_source_url: dto.sourceUrl ?? null,
              p_content_hash: dto.contentHash,
              p_structured_metadata: dto.structuredMetadata ?? {}
            });
            const evidenceId = this.db.ensure(data as string | null, error, "Create evidence");

            const { data: evidence, error: evidenceError } = await this.db.admin
              .from("evidence_items")
              .select("*")
              .eq("id", evidenceId)
              .single();
            const mappedEvidence = mapEvidence(this.db.ensure(evidence, evidenceError, "Read evidence"));

            await this.audit.record({
              actorId: user.id,
              action: "evidence.created",
              target: mappedEvidence.id,
              metadata: { covenantId, type: mappedEvidence.type }
            });

            return mappedEvidence;
          }

          async list(user: AuthenticatedUser, covenantId: string) {
            await this.assertCanViewEvidence(user, covenantId);

            const { data, error } = await this.db.admin
              .from("evidence_items")
              .select("*")
              .eq("covenant_id", covenantId)
              .order("created_at", { ascending: false });

            return this.db.ensureArray(data, error, "List evidence").map(mapEvidence);
          }

          private async assertCanSubmitEvidence(user: AuthenticatedUser, covenantId: string) {
            const covenant = await this.findCovenantWithParticipants(covenantId);

            const canSubmit =
              covenant.creator_id === user.id ||
              covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

            if (!canSubmit) {
              throw new ForbiddenException("You cannot submit evidence for this covenant.");
            }

            if (["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED"].includes(covenant.status)) {
              throw new BadRequestException("This covenant no longer accepts evidence.");
            }
          }

          private async assertCanViewEvidence(user: AuthenticatedUser, covenantId: string) {
            const covenant = await this.findCovenantWithParticipants(covenantId);

            const canView =
              covenant.creator_id === user.id ||
              covenant.privacy === "PUBLIC" ||
              covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

            if (!canView) {
              throw new ForbiddenException("You cannot view evidence for this covenant.");
            }
          }

          private async findCovenantWithParticipants(covenantId: string) {
            const { data, error } = await this.db.admin
              .from("covenants")
              .select("*, participants:covenant_participants(*)")
              .eq("id", covenantId)
              .maybeSingle();
            this.db.throwIfError(error, "Find covenant for evidence");
            if (!data) {
              throw new NotFoundException("Covenant not found.");
            }
            return data as any;
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/bonds/bonds.service.ts",
        r'''
        import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
        import { AuditService } from "../audit/audit.service";
        import { AuthenticatedUser } from "../auth/auth.service";
        import { mapBond } from "../database/record-mappers";
        import { SupabaseService } from "../database/supabase.service";
        import { CreateBondPositionDto } from "./dto/create-bond-position.dto";

        @Injectable()
        export class BondsService {
          constructor(
            private readonly audit: AuditService,
            private readonly db: SupabaseService
          ) {}

          async create(user: AuthenticatedUser, covenantId: string, dto: CreateBondPositionDto) {
            const covenant = await this.findCovenantWithParticipants(covenantId);

            if (["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED", "EVALUATION_PENDING"].includes(covenant.status)) {
              throw new BadRequestException("This covenant no longer accepts new bonds.");
            }

            if (dto.role === "CREATOR" && covenant.creator_id !== user.id) {
              throw new ForbiddenException("Only the covenant creator can register the creator bond.");
            }

            if (dto.role !== "CREATOR" && covenant.privacy === "PRIVATE") {
              const isParticipant = covenant.participants.some(
                (participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress
              );
              if (!isParticipant) {
                throw new ForbiddenException("Private covenants only accept bonds from participants.");
              }
            }

            const { data, error } = await this.db.admin.rpc("pacta_register_bond_position", {
              p_covenant_id: covenantId,
              p_user_id: user.id,
              p_wallet_address: user.walletAddress,
              p_amount: dto.amount,
              p_tx_hash: dto.txHash,
              p_role: dto.role,
              p_contract_covenant_id: dto.contractCovenantId ?? covenant.contract_covenant_id
            });
            const bondId = this.db.ensure(data as string | null, error, "Register bond position");

            const { data: bondRow, error: bondError } = await this.db.admin
              .from("bond_positions")
              .select("*, user:users(id,wallet_address,display_name,created_at,updated_at)")
              .eq("id", bondId)
              .single();
            const bond = mapBond(this.db.ensure(bondRow, bondError, "Read bond position"));

            await this.audit.record({
              actorId: user.id,
              action: "bond.submitted",
              target: bond.id,
              metadata: { covenantId, amount: dto.amount, txHash: dto.txHash, role: dto.role }
            });

            return bond;
          }

          async list(user: AuthenticatedUser, covenantId: string) {
            await this.assertCanViewBonds(user, covenantId);

            const { data, error } = await this.db.admin
              .from("bond_positions")
              .select("*, user:users(id,wallet_address,display_name,created_at,updated_at)")
              .eq("covenant_id", covenantId)
              .order("created_at", { ascending: false });

            return this.db.ensureArray(data, error, "List bond positions").map(mapBond);
          }

          private async assertCanViewBonds(user: AuthenticatedUser, covenantId: string) {
            const covenant = await this.findCovenantWithParticipants(covenantId);

            const canView =
              covenant.creator_id === user.id ||
              covenant.privacy === "PUBLIC" ||
              covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

            if (!canView) {
              throw new ForbiddenException("You cannot view bonds for this covenant.");
            }
          }

          private async findCovenantWithParticipants(covenantId: string) {
            const { data, error } = await this.db.admin
              .from("covenants")
              .select("*, participants:covenant_participants(*)")
              .eq("id", covenantId)
              .maybeSingle();
            this.db.throwIfError(error, "Find covenant for bond");
            if (!data) {
              throw new NotFoundException("Covenant not found.");
            }
            return data as any;
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/contract-events/contract-events.service.ts",
        r'''
        import { BadRequestException, Injectable } from "@nestjs/common";
        import { AuditService } from "../audit/audit.service";
        import { SupabaseService } from "../database/supabase.service";
        import { IngestContractEventDto } from "./dto/ingest-contract-event.dto";

        type EvaluationOutcome = "FULFILLED" | "PARTIALLY_FULFILLED" | "BROKEN";

        @Injectable()
        export class ContractEventsService {
          constructor(
            private readonly audit: AuditService,
            private readonly db: SupabaseService
          ) {}

          async ingest(dto: IngestContractEventDto) {
            const event = await this.persistEvent(dto.txHash, dto.logIndex, dto.eventName, dto.payload);

            await this.applyKnownEvent(dto.eventName, dto.payload, dto.txHash);
            await this.audit.record({
              action: "contract_event.ingested",
              target: event.id,
              metadata: { txHash: dto.txHash, logIndex: dto.logIndex, eventName: dto.eventName, source: dto.source }
            });

            return event;
          }

          async ingestPactaContractEvent(event: Record<string, unknown>, source: string) {
            const eventId = this.numberPayload(event, "event_id");
            const eventName = this.stringPayload(event, "event_type");
            const syntheticTxHash = `0x${eventId.toString(16).padStart(64, "0")}`;
            const persisted = await this.persistEvent(syntheticTxHash, 0, eventName, event);

            await this.applyKnownEvent(eventName, event, syntheticTxHash);
            await this.audit.record({
              action: "contract_event.synced_from_genlayer",
              target: persisted.id,
              metadata: { eventId, eventName, source }
            });

            return persisted;
          }

          private async persistEvent(txHash: string, logIndex: number, eventName: string, payload: Record<string, unknown>) {
            const { data, error } = await this.db.admin
              .from("contract_events")
              .upsert(
                {
                  tx_hash: txHash,
                  log_index: logIndex,
                  event_name: eventName,
                  payload
                },
                { onConflict: "tx_hash,log_index", ignoreDuplicates: false }
              )
              .select("*")
              .single();
            return this.db.ensure(data, error, "Persist contract event");
          }

          private async applyKnownEvent(eventName: string, payload: Record<string, unknown>, txHash: string) {
            if (eventName === "BondConfirmed") {
              await this.applyBondConfirmed(payload, txHash);
              return;
            }

            if (eventName === "CovenantEvaluated") {
              await this.applyCovenantEvaluated(payload, txHash);
            }
          }

          private async applyBondConfirmed(payload: Record<string, unknown>, txHash: string) {
            const bondPositionId = this.stringPayload(payload, "bondPositionId");
            const covenantId = this.stringPayload(payload, "covenantId");
            const contractCovenantId = this.optionalStringPayload(payload, "contractCovenantId");

            const { error } = await this.db.admin.rpc("pacta_apply_bond_confirmed", {
              p_bond_position_id: bondPositionId,
              p_covenant_id: covenantId,
              p_contract_covenant_id: contractCovenantId,
              p_tx_hash: txHash
            });
            this.db.throwIfError(error, "Apply bond confirmation");
          }

          private async applyCovenantEvaluated(payload: Record<string, unknown>, txHash: string) {
            const eventPayload = this.optionalObjectPayload(payload, "payload") ?? payload;
            const covenantId = this.optionalStringPayload(payload, "covenant_id") ?? this.stringPayload(eventPayload, "covenantId");
            const outcome = this.outcomePayload(eventPayload);
            const confidence = this.numberPayload(eventPayload, "confidence");
            const reasoning = this.reasoningPayload(eventPayload);
            const bondDistribution = this.bondDistributionPayload(eventPayload);
            const reputationImpact = this.reputationImpactPayload(eventPayload);

            if (confidence < 0 || confidence > 100) {
              throw new BadRequestException("Evaluation confidence must be between 0 and 100.");
            }

            const { data: covenant, error: covenantError } = await this.db.admin
              .from("covenants")
              .select("creator_id")
              .eq("id", covenantId)
              .maybeSingle();
            this.db.throwIfError(covenantError, "Read covenant for evaluation");
            if (!covenant) {
              throw new BadRequestException("Covenant in contract event does not exist.");
            }

            const reputationDelta = this.reputationDelta(outcome, confidence, reputationImpact);
            const { error } = await this.db.admin.rpc("pacta_apply_covenant_evaluated", {
              p_covenant_id: covenantId,
              p_creator_id: covenant.creator_id,
              p_outcome: outcome,
              p_confidence: confidence,
              p_reasoning: reasoning,
              p_bond_distribution: bondDistribution,
              p_reputation_impact: reputationImpact,
              p_contract_tx_hash: txHash,
              p_reputation_delta: reputationDelta
            });
            this.db.throwIfError(error, "Apply covenant evaluation");
          }

          private reputationDelta(outcome: EvaluationOutcome, confidence: number, reputationImpact: Record<string, unknown>) {
            const explicitDelta = reputationImpact.delta;
            if (typeof explicitDelta === "number" && Number.isFinite(explicitDelta)) {
              return Math.round(explicitDelta);
            }

            if (outcome === "FULFILLED") {
              return Math.round(10 + confidence / 10);
            }
            if (outcome === "PARTIALLY_FULFILLED") {
              return Math.round(confidence / 20);
            }
            return -Math.round(10 + confidence / 10);
          }

          private stringPayload(payload: Record<string, unknown>, key: string) {
            const value = payload[key];
            if (typeof value !== "string" || value.length === 0) {
              throw new BadRequestException(`${key} must be a non-empty string.`);
            }
            return value;
          }

          private optionalStringPayload(payload: Record<string, unknown>, key: string) {
            const value = payload[key];
            return typeof value === "string" && value.length > 0 ? value : undefined;
          }

          private numberPayload(payload: Record<string, unknown>, key: string) {
            const value = payload[key];
            if (typeof value !== "number" || !Number.isFinite(value)) {
              throw new BadRequestException(`${key} must be a finite number.`);
            }
            return value;
          }

          private optionalObjectPayload(payload: Record<string, unknown>, key: string) {
            const value = payload[key];
            return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
          }

          private outcomePayload(payload: Record<string, unknown>): EvaluationOutcome {
            const value = this.optionalStringPayload(payload, "outcome") ?? this.optionalStringPayload(payload, "status") ?? "";
            if (!["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN"].includes(value)) {
              throw new BadRequestException("Evaluation outcome is invalid.");
            }
            return value as EvaluationOutcome;
          }

          private reasoningPayload(payload: Record<string, unknown>) {
            const value = payload.reasoning;
            if (value && typeof value === "object" && !Array.isArray(value)) {
              return value as Record<string, unknown>;
            }
            if (typeof value === "string") {
              return { text: value };
            }
            throw new BadRequestException("reasoning must be a string or object.");
          }

          private bondDistributionPayload(payload: Record<string, unknown>) {
            const value = payload.bondDistribution;
            if (value && typeof value === "object" && !Array.isArray(value)) {
              return value as Record<string, unknown>;
            }
            return {
              returnBps: payload.return_bps,
              slashBps: payload.slash_bps
            };
          }

          private reputationImpactPayload(payload: Record<string, unknown>) {
            const value = payload.reputationImpact;
            if (value && typeof value === "object" && !Array.isArray(value)) {
              return value as Record<string, unknown>;
            }
            return {
              delta: payload.reputation_delta
            };
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/reputation/reputation.service.ts",
        r'''
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
        ''',
    )

    write_file(
        "backend/src/modules/storage/storage.service.ts",
        r'''
        import { Injectable, ServiceUnavailableException } from "@nestjs/common";
        import { randomUUID } from "node:crypto";
        import { SupabaseService } from "../database/supabase.service";

        export type CreateUploadUrlInput = {
          covenantId: string;
          filename: string;
          contentType: string;
          contentLength: number;
          contentHash: string;
        };

        @Injectable()
        export class StorageService {
          private readonly maxEvidenceBytes = 1024 * 1024 * 100;
          private readonly allowedContentTypes = new Set([
            "application/pdf",
            "application/json",
            "image/jpeg",
            "image/png",
            "image/webp",
            "text/plain",
            "video/mp4"
          ]);

          constructor(private readonly db: SupabaseService) {}

          async createEvidenceUploadUrl(input: CreateUploadUrlInput) {
            if (!this.allowedContentTypes.has(input.contentType)) {
              throw new ServiceUnavailableException("Unsupported evidence content type.");
            }

            if (input.contentLength <= 0 || input.contentLength > this.maxEvidenceBytes) {
              throw new ServiceUnavailableException("Evidence file size is outside the allowed range.");
            }

            const bucket = this.db.required("SUPABASE_STORAGE_BUCKET");
            const objectKey = `evidence/${input.covenantId}/${randomUUID()}-${this.safeFilename(input.filename)}`;
            const { data, error } = await this.db.admin.storage.from(bucket).createSignedUploadUrl(objectKey);
            if (error) {
              throw new ServiceUnavailableException(`Could not create Supabase signed upload URL: ${error.message}`);
            }

            return {
              uploadUrl: data.signedUrl,
              token: data.token,
              storageUri: `supabase://${bucket}/${objectKey}`,
              objectKey,
              provider: "supabase",
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
              requiredHeaders: {
                "content-type": input.contentType,
                "x-upsert": "false"
              }
            };
          }

          private safeFilename(filename: string) {
            return filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "evidence";
          }
        }
        ''',
    )

    write_file(
        "backend/src/modules/contract-events/contract-events.service.spec.ts",
        r'''
        import { BadRequestException } from "@nestjs/common";
        import { ContractEventsService } from "./contract-events.service";

        function createService() {
          const db = {
            admin: {
              from: jest.fn((table: string) => {
                if (table === "contract_events") {
                  return {
                    upsert: jest.fn(() => ({
                      select: jest.fn(() => ({
                        single: jest.fn().mockResolvedValue({ data: { id: "event-1" }, error: null })
                      }))
                    }))
                  };
                }
                if (table === "covenants") {
                  return {
                    select: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        maybeSingle: jest.fn().mockResolvedValue({ data: { creator_id: "user-1" }, error: null })
                      }))
                    }))
                  };
                }
                return {};
              }),
              rpc: jest.fn().mockResolvedValue({ data: null, error: null })
            },
            ensure: jest.fn((data, error) => {
              if (error) {
                throw new Error(error.message);
              }
              return data;
            }),
            throwIfError: jest.fn((error) => {
              if (error) {
                throw new Error(error.message);
              }
            })
          };
          const audit = {
            record: jest.fn().mockResolvedValue(undefined)
          };
          return {
            db,
            audit,
            service: new ContractEventsService(audit as any, db as any)
          };
        }

        describe("ContractEventsService", () => {
          it("persists and applies Pacta covenant evaluation events", async () => {
            const { db, service } = createService();

            await service.ingestPactaContractEvent(
              {
                event_id: 7,
                event_type: "CovenantEvaluated",
                covenant_id: "covenant-1",
                payload: {
                  outcome: "FULFILLED",
                  confidence: 92,
                  reasoning: "Evidence satisfies the covenant.",
                  bondDistribution: { returnBps: 10000, slashBps: 0 },
                  reputationImpact: { delta: 19 }
                }
              },
              "test"
            );

            expect(db.admin.rpc).toHaveBeenCalledWith(
              "pacta_apply_covenant_evaluated",
              expect.objectContaining({
                p_covenant_id: "covenant-1",
                p_outcome: "FULFILLED",
                p_confidence: 92,
                p_reputation_delta: 19
              })
            );
          });

          it("rejects malformed evaluation confidence", async () => {
            const { service } = createService();

            await expect(
              service.ingestPactaContractEvent(
                {
                  event_id: 8,
                  event_type: "CovenantEvaluated",
                  covenant_id: "covenant-1",
                  payload: {
                    outcome: "BROKEN",
                    confidence: 200,
                    reasoning: "Invalid confidence."
                  }
                },
                "test"
              )
            ).rejects.toThrow(BadRequestException);
          });
        });
        ''',
    )

    write_file(
        "supabase/migrations/202607040000_pacta_core_schema.sql",
        r'''
        create extension if not exists pgcrypto;

        create or replace function public.set_updated_at()
        returns trigger
        language plpgsql
        as $$
        begin
          new.updated_at = now();
          return new;
        end;
        $$;

        create table if not exists public.users (
          id uuid primary key default gen_random_uuid(),
          wallet_address text not null unique,
          display_name text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists public.wallet_nonces (
          id uuid primary key default gen_random_uuid(),
          wallet_address text not null,
          nonce text not null unique,
          expires_at timestamptz not null,
          consumed_at timestamptz,
          created_at timestamptz not null default now()
        );

        create table if not exists public.sessions (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references public.users(id) on delete cascade,
          token_hash text not null unique,
          expires_at timestamptz not null,
          created_at timestamptz not null default now()
        );

        create table if not exists public.covenants (
          id uuid primary key default gen_random_uuid(),
          contract_covenant_id text unique,
          creator_id uuid not null references public.users(id),
          title text not null check (char_length(title) between 3 and 120),
          promise text not null,
          success_criteria text not null,
          evidence_requirements text not null,
          deadline_at timestamptz not null,
          privacy text not null default 'PRIVATE' check (privacy in ('PRIVATE', 'UNLISTED', 'PUBLIC')),
          status text not null default 'DRAFT' check (
            status in (
              'DRAFT',
              'BONDED',
              'ACTIVE',
              'EVIDENCE_SUBMITTED',
              'EVALUATION_PENDING',
              'FULFILLED',
              'PARTIALLY_FULFILLED',
              'BROKEN',
              'CANCELLED'
            )
          ),
          required_bond_amount numeric(30, 10) not null,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists public.covenant_participants (
          id uuid primary key default gen_random_uuid(),
          covenant_id uuid not null references public.covenants(id) on delete cascade,
          wallet_address text not null,
          role text not null,
          created_at timestamptz not null default now(),
          unique (covenant_id, wallet_address, role)
        );

        create table if not exists public.bond_positions (
          id uuid primary key default gen_random_uuid(),
          covenant_id uuid not null references public.covenants(id) on delete cascade,
          user_id uuid not null references public.users(id),
          amount numeric(30, 10) not null,
          status text not null default 'PENDING',
          tx_hash text,
          created_at timestamptz not null default now()
        );

        create table if not exists public.evidence_items (
          id uuid primary key default gen_random_uuid(),
          covenant_id uuid not null references public.covenants(id) on delete cascade,
          type text not null check (
            type in (
              'DOCUMENT',
              'GITHUB_COMMIT',
              'PAYMENT_RECEIPT',
              'PHOTO',
              'VIDEO',
              'API_RESPONSE',
              'ATTESTATION',
              'IOT_DEVICE_DATA',
              'SOCIAL_PROOF',
              'URL',
              'STRUCTURED_METADATA'
            )
          ),
          storage_uri text,
          source_url text,
          content_hash text not null,
          structured_metadata jsonb not null default '{}'::jsonb,
          verification_status text not null default 'PENDING',
          created_at timestamptz not null default now()
        );

        create table if not exists public.evaluations (
          id uuid primary key default gen_random_uuid(),
          covenant_id uuid not null references public.covenants(id) on delete cascade,
          outcome text not null,
          confidence integer not null check (confidence between 0 and 100),
          reasoning jsonb not null,
          bond_distribution jsonb not null,
          reputation_impact jsonb not null,
          contract_tx_hash text,
          created_at timestamptz not null default now()
        );

        create table if not exists public.reputation_events (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references public.users(id),
          event_type text not null,
          delta integer not null,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        );

        create table if not exists public.contract_events (
          id uuid primary key default gen_random_uuid(),
          tx_hash text not null,
          log_index integer not null,
          event_name text not null,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          unique (tx_hash, log_index)
        );

        create table if not exists public.audit_logs (
          id uuid primary key default gen_random_uuid(),
          actor_id uuid,
          action text not null,
          target text not null,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        );

        drop trigger if exists set_users_updated_at on public.users;
        create trigger set_users_updated_at before update on public.users
        for each row execute function public.set_updated_at();

        drop trigger if exists set_covenants_updated_at on public.covenants;
        create trigger set_covenants_updated_at before update on public.covenants
        for each row execute function public.set_updated_at();

        create index if not exists wallet_nonces_wallet_address_expires_at_idx on public.wallet_nonces(wallet_address, expires_at);
        create index if not exists sessions_user_id_expires_at_idx on public.sessions(user_id, expires_at);
        create index if not exists covenants_creator_id_created_at_idx on public.covenants(creator_id, created_at);
        create index if not exists covenants_status_deadline_at_idx on public.covenants(status, deadline_at);
        create index if not exists covenant_participants_wallet_address_idx on public.covenant_participants(wallet_address);
        create index if not exists bond_positions_covenant_id_status_idx on public.bond_positions(covenant_id, status);
        create index if not exists evidence_items_covenant_id_type_idx on public.evidence_items(covenant_id, type);
        create index if not exists evaluations_covenant_id_created_at_idx on public.evaluations(covenant_id, created_at);
        create index if not exists reputation_events_user_id_created_at_idx on public.reputation_events(user_id, created_at);
        create index if not exists audit_logs_actor_id_created_at_idx on public.audit_logs(actor_id, created_at);

        create or replace function public.pacta_consume_wallet_nonce_and_create_session(
          p_nonce_id uuid,
          p_user_id uuid,
          p_token_hash text,
          p_expires_at timestamptz
        )
        returns void
        language plpgsql
        security definer
        set search_path = public
        as $$
        begin
          update public.wallet_nonces
          set consumed_at = now()
          where id = p_nonce_id and consumed_at is null and expires_at > now();

          if not found then
            raise exception 'wallet nonce is expired or already consumed';
          end if;

          insert into public.sessions (user_id, token_hash, expires_at)
          values (p_user_id, p_token_hash, p_expires_at);
        end;
        $$;

        create or replace function public.pacta_create_covenant_with_creator(
          p_creator_id uuid,
          p_wallet_address text,
          p_title text,
          p_promise text,
          p_success_criteria text,
          p_evidence_requirements text,
          p_deadline_at timestamptz,
          p_privacy text,
          p_required_bond_amount numeric,
          p_metadata jsonb
        )
        returns uuid
        language plpgsql
        security definer
        set search_path = public
        as $$
        declare
          v_covenant_id uuid;
        begin
          insert into public.covenants (
            creator_id,
            title,
            promise,
            success_criteria,
            evidence_requirements,
            deadline_at,
            privacy,
            required_bond_amount,
            metadata
          )
          values (
            p_creator_id,
            p_title,
            p_promise,
            p_success_criteria,
            p_evidence_requirements,
            p_deadline_at,
            p_privacy,
            p_required_bond_amount,
            coalesce(p_metadata, '{}'::jsonb)
          )
          returning id into v_covenant_id;

          insert into public.covenant_participants (covenant_id, wallet_address, role)
          values (v_covenant_id, p_wallet_address, 'CREATOR')
          on conflict (covenant_id, wallet_address, role) do nothing;

          return v_covenant_id;
        end;
        $$;

        create or replace function public.pacta_create_evidence_item(
          p_covenant_id uuid,
          p_type text,
          p_storage_uri text,
          p_source_url text,
          p_content_hash text,
          p_structured_metadata jsonb
        )
        returns uuid
        language plpgsql
        security definer
        set search_path = public
        as $$
        declare
          v_evidence_id uuid;
        begin
          insert into public.evidence_items (
            covenant_id,
            type,
            storage_uri,
            source_url,
            content_hash,
            structured_metadata,
            verification_status
          )
          values (
            p_covenant_id,
            p_type,
            p_storage_uri,
            p_source_url,
            p_content_hash,
            coalesce(p_structured_metadata, '{}'::jsonb),
            'SUBMITTED'
          )
          returning id into v_evidence_id;

          update public.covenants
          set status = 'EVIDENCE_SUBMITTED'
          where id = p_covenant_id;

          return v_evidence_id;
        end;
        $$;

        create or replace function public.pacta_register_bond_position(
          p_covenant_id uuid,
          p_user_id uuid,
          p_wallet_address text,
          p_amount numeric,
          p_tx_hash text,
          p_role text,
          p_contract_covenant_id text
        )
        returns uuid
        language plpgsql
        security definer
        set search_path = public
        as $$
        declare
          v_bond_id uuid;
        begin
          insert into public.bond_positions (covenant_id, user_id, amount, status, tx_hash)
          values (p_covenant_id, p_user_id, p_amount, 'SUBMITTED', p_tx_hash)
          returning id into v_bond_id;

          insert into public.covenant_participants (covenant_id, wallet_address, role)
          values (p_covenant_id, p_wallet_address, p_role)
          on conflict (covenant_id, wallet_address, role) do nothing;

          update public.covenants
          set status = 'BONDED',
              contract_covenant_id = coalesce(p_contract_covenant_id, contract_covenant_id)
          where id = p_covenant_id;

          return v_bond_id;
        end;
        $$;

        create or replace function public.pacta_apply_bond_confirmed(
          p_bond_position_id uuid,
          p_covenant_id uuid,
          p_contract_covenant_id text,
          p_tx_hash text
        )
        returns void
        language plpgsql
        security definer
        set search_path = public
        as $$
        begin
          update public.bond_positions
          set status = 'CONFIRMED', tx_hash = p_tx_hash
          where id = p_bond_position_id;

          update public.covenants
          set status = 'ACTIVE',
              contract_covenant_id = coalesce(p_contract_covenant_id, contract_covenant_id)
          where id = p_covenant_id;
        end;
        $$;

        create or replace function public.pacta_apply_covenant_evaluated(
          p_covenant_id uuid,
          p_creator_id uuid,
          p_outcome text,
          p_confidence integer,
          p_reasoning jsonb,
          p_bond_distribution jsonb,
          p_reputation_impact jsonb,
          p_contract_tx_hash text,
          p_reputation_delta integer
        )
        returns void
        language plpgsql
        security definer
        set search_path = public
        as $$
        begin
          insert into public.evaluations (
            covenant_id,
            outcome,
            confidence,
            reasoning,
            bond_distribution,
            reputation_impact,
            contract_tx_hash
          )
          values (
            p_covenant_id,
            p_outcome,
            p_confidence,
            p_reasoning,
            p_bond_distribution,
            p_reputation_impact,
            p_contract_tx_hash
          );

          update public.covenants
          set status = p_outcome
          where id = p_covenant_id;

          insert into public.reputation_events (user_id, event_type, delta, metadata)
          values (
            p_creator_id,
            'COVENANT_' || p_outcome,
            p_reputation_delta,
            jsonb_build_object('covenantId', p_covenant_id, 'confidence', p_confidence, 'txHash', p_contract_tx_hash)
          );
        end;
        $$;
        ''',
    )

    write_file(
        "database/scripts/validate-supabase-sql.mjs",
        r'''
        import { readdirSync, readFileSync } from "node:fs";
        import { join } from "node:path";

        const migrationsDir = join(process.cwd(), "..", "supabase", "migrations");
        const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

        if (files.length === 0) {
          console.error("No Supabase SQL migrations found.");
          process.exit(1);
        }

        for (const file of files) {
          const content = readFileSync(join(migrationsDir, file), "utf8");
          if (!content.trim()) {
            console.error(`${file} is empty.`);
            process.exit(1);
          }
          if (content.includes("TODO") || content.includes("FIXME")) {
            console.error(`${file} contains unfinished markers.`);
            process.exit(1);
          }
        }

        console.log(`Validated ${files.length} Supabase SQL migration(s).`);
        ''',
    )

    write_file(
        "database/scripts/print-migration-instructions.mjs",
        r'''
        console.log("Run the SQL files in supabase/migrations in order using the Supabase SQL editor or Supabase CLI.");
        console.log("Start with: supabase/migrations/202607040000_pacta_core_schema.sql");
        ''',
    )

    remove_path("database/scripts/validate-prisma.mjs")
    remove_path("database/prisma")

    update_json(
        "database/package.json",
        lambda value: (
            value.__setitem__(
                "scripts",
                {
                    "build": "node ./scripts/validate-supabase-sql.mjs",
                    "lint": "node ./scripts/validate-supabase-sql.mjs",
                    "typecheck": "node ./scripts/validate-supabase-sql.mjs",
                    "test": "node ./scripts/validate-supabase-sql.mjs",
                    "migrate:instructions": "node ./scripts/print-migration-instructions.mjs",
                },
            ),
            value.__setitem__("dependencies", {}),
            value.__setitem__("devDependencies", {}),
        ),
    )

    update_json(
        "package.json",
        lambda value: value.__setitem__(
            "scripts",
            {
                **{k: v for k, v in value["scripts"].items() if k not in {"db:generate", "db:migrate"}},
                "db:validate": "pnpm --filter @pacta/database typecheck",
                "db:migrate": "pnpm --filter @pacta/database migrate:instructions",
            },
        ),
    )

    update_pnpm_workspace()

    write_file(
        "scripts/run_local_stack.py",
        r'''
        from __future__ import annotations

        import argparse
        import secrets
        import shutil
        import socket
        import subprocess
        import sys
        import time
        from pathlib import Path


        ROOT = Path(__file__).resolve().parents[1]
        PNPM = shutil.which("pnpm") or shutil.which("pnpm.cmd")


        def run(command: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
          print("$ " + " ".join(command))
          return subprocess.run(command, cwd=ROOT, check=check, text=True)


        def pnpm_command(*args: str) -> list[str]:
          if not PNPM:
            raise RuntimeError("pnpm was not found on PATH")
          return [PNPM, *args]


        def env_value(name: str) -> str:
          env_path = ROOT / ".env"
          if not env_path.exists():
            return ""
          for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith(f"{name}="):
              return line.split("=", 1)[1].strip().strip('"')
          return ""


        def ensure_env() -> None:
          env_path = ROOT / ".env"
          if env_path.exists():
            print(".env already exists")
            return

          template = (ROOT / ".env.example").read_text(encoding="utf-8")
          template = template.replace("replace-with-strong-random-secret", secrets.token_urlsafe(48))
          template = template.replace("replace-with-strong-internal-token", secrets.token_urlsafe(48))
          env_path.write_text(template, encoding="utf-8", newline="\n")
          print("created .env with local development secrets")


        def wait_for_port(host: str, port: int, timeout_seconds: int) -> None:
          deadline = time.time() + timeout_seconds
          while time.time() < deadline:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
              sock.settimeout(2)
              if sock.connect_ex((host, port)) == 0:
                print(f"{host}:{port} is accepting connections")
                return
            time.sleep(2)
          raise RuntimeError(f"Timed out waiting for {host}:{port}")


        def prepare_database() -> None:
          backend_provider = env_value("BACKEND_PROVIDER")
          using_supabase = backend_provider == "supabase" and "supabase.co" in env_value("SUPABASE_URL")

          if using_supabase:
            print("using Supabase directly; apply SQL migrations in supabase/migrations before first runtime use")
            return

          docker = shutil.which("docker")
          if docker:
            run([docker, "compose", "-f", "infra/local/docker-compose.yml", "up", "-d", "postgres"])
            wait_for_port("127.0.0.1", 5432, 60)
            print("local PostgreSQL is running; apply supabase/migrations SQL manually for local database use")
            return

          raise RuntimeError("No Supabase URL, Docker, or local PostgreSQL path is configured.")


        def start_dev_servers() -> None:
          logs_dir = ROOT / ".local" / "logs"
          logs_dir.mkdir(parents=True, exist_ok=True)
          processes = [
            ("backend", pnpm_command("--filter", "@pacta/backend", "dev"), logs_dir / "backend.log"),
            ("frontend", pnpm_command("--filter", "@pacta/frontend", "dev"), logs_dir / "frontend.log"),
          ]
          for name, command, log_path in processes:
            log = log_path.open("a", encoding="utf-8")
            subprocess.Popen(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
            print(f"started {name}; log: {log_path}")
          print("frontend: http://localhost:3000")
          print("backend:  http://localhost:4000")


        def main() -> None:
          parser = argparse.ArgumentParser(description="Prepare and optionally start the local Pacta stack.")
          parser.add_argument("--start", action="store_true", help="start backend and frontend dev servers after preparation")
          args = parser.parse_args()

          ensure_env()
          prepare_database()
          if args.start:
            start_dev_servers()


        if __name__ == "__main__":
          try:
            main()
          except Exception as exc:
            print(f"local stack failed: {exc}", file=sys.stderr)
            raise
        ''',
    )

    write_file(
        "docs/SUPABASE.md",
        r'''
        # Supabase Backend

        Supabase is the approved backend platform for Pacta. Pacta now uses Supabase directly rather than Prisma.

        ## Runtime Model

        - NestJS remains the application API boundary for wallet sessions, CSRF protection, GenLayer synchronization, audit logging, and authorization.
        - Supabase Postgres stores Pacta domain data.
        - Supabase Storage stores evidence files.
        - `@supabase/supabase-js` is the backend database and storage client.

        ## Required Environment

        ```bash
        BACKEND_PROVIDER=supabase
        STORAGE_PROVIDER=supabase
        SUPABASE_PROJECT_REF=
        SUPABASE_URL=
        SUPABASE_ANON_KEY=
        SUPABASE_SERVICE_ROLE_KEY=
        SUPABASE_STORAGE_BUCKET=pacta-evidence
        NEXT_PUBLIC_SUPABASE_URL=
        NEXT_PUBLIC_SUPABASE_ANON_KEY=
        ```

        The service role key is server-only. Never expose it through `NEXT_PUBLIC_*`.

        ## Migrations

        Run these SQL files in order in the Supabase SQL editor or via Supabase CLI:

        1. `supabase/migrations/202607040000_pacta_core_schema.sql`
        2. `supabase/migrations/202607040001_pacta_storage_bucket.sql`

        The first migration creates Pacta tables, indexes, update triggers, and transactional RPC functions used by the backend. The second migration creates the private evidence bucket.

        ## Storage Uploads

        The backend creates signed upload URLs with Supabase Storage. S3 access keys are no longer required for the default Pacta storage path.
        ''',
    )

    write_file(
        "docs/DATABASE.md",
        r'''
        # Database

        Pacta uses Supabase Postgres directly through `@supabase/supabase-js`.

        ## Migrations

        SQL migrations live in `supabase/migrations` and should be applied in filename order.

        - `202607040000_pacta_core_schema.sql` creates domain tables, indexes, triggers, and RPC functions.
        - `202607040001_pacta_storage_bucket.sql` creates the private evidence bucket.

        ## Tables

        - `users`
        - `wallet_nonces`
        - `sessions`
        - `covenants`
        - `covenant_participants`
        - `bond_positions`
        - `evidence_items`
        - `evaluations`
        - `reputation_events`
        - `contract_events`
        - `audit_logs`

        ## Transactional RPC Functions

        Pacta uses Postgres functions for multi-write operations that must stay atomic:

        - `pacta_consume_wallet_nonce_and_create_session`
        - `pacta_create_covenant_with_creator`
        - `pacta_create_evidence_item`
        - `pacta_register_bond_position`
        - `pacta_apply_bond_confirmed`
        - `pacta_apply_covenant_evaluated`
        ''',
    )

    write_file(
        "docs/DEPLOYMENT.md",
        r'''
        # Deployment

        ## Targets

        - Frontend: Vercel
        - Backend platform: Supabase
        - Database: Supabase Postgres, accessed directly with `@supabase/supabase-js`
        - Storage: Supabase Storage signed upload URLs
        - Application API: NestJS service, with future option to migrate selected endpoints to Supabase Edge Functions
        - Intelligent Contract: GenLayer Studio / StudioNet

        ## Supabase Setup

        Before first runtime use, run SQL migrations in order:

        ```text
        supabase/migrations/202607040000_pacta_core_schema.sql
        supabase/migrations/202607040001_pacta_storage_bucket.sql
        ```

        ## Local Runtime

        ```bash
        python scripts/run_local_stack.py --start
        ```

        The local script checks environment setup and starts frontend/backend dev servers. Database schema application happens through Supabase SQL migrations.

        ## GenLayer

        The Pacta Intelligent Contract is deployed on StudioNet:

        ```text
        0x6a7d7807612a5485e83E53c776fcfe35fE685C59
        ```

        Required GenLayer env:

        ```bash
        GENLAYER_NETWORK=studionet
        GENLAYER_RPC_URL=https://studio.genlayer.com/api
        GENLAYER_CONTRACT_ADDRESS=0x6a7d7807612a5485e83E53c776fcfe35fE685C59
        NEXT_PUBLIC_GENLAYER_NETWORK=studionet
        NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
        NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x6a7d7807612a5485e83E53c776fcfe35fE685C59
        ```
        ''',
    )

    write_file(
        "supabase/README.md",
        r'''
        # Supabase

        Supabase is Pacta's backend platform.

        Apply migrations in this order:

        1. `migrations/202607040000_pacta_core_schema.sql`
        2. `migrations/202607040001_pacta_storage_bucket.sql`

        The backend uses the service role key with `@supabase/supabase-js` for server-side database access and signed evidence upload URLs.
        ''',
    )

    write_file(
        "README.md",
        r'''
        # Pacta

        Pacta is a bond-backed personal covenant registry powered by GenLayer. Users create meaningful promises, back them with GEN stakes, submit evidence, and rely on GenLayer Intelligent Contracts plus AI-assisted validator consensus to determine fulfillment outcomes.

        ## Stack

        - Frontend: Next.js, TypeScript, Tailwind CSS
        - Backend: NestJS API with direct Supabase access
        - Database: Supabase Postgres with SQL migrations
        - Contracts: GenLayer Intelligent Contract deployed to StudioNet
        - Storage: Supabase Storage signed upload URLs
        - Auth: Wallet authentication with signed nonce sessions
        - Observability: Sentry, OpenTelemetry, structured logs
        - CI/CD: GitHub Actions

        ## Repository Layout

        - `frontend/` - Next.js user experience
        - `backend/` - NestJS REST API and workers
        - `contracts/` - GenLayer Intelligent Contract source and tests
        - `supabase/` - Supabase SQL migrations
        - `database/` - migration validation scripts
        - `shared/` - shared schemas and TypeScript types
        - `docs/` - product, architecture, API, database, security, deployment, and testing docs
        - `scripts/` - executable project automation
        - `infra/` - local infrastructure configuration
        - `monitoring/` - observability configuration
        - `security/` - threat model and security checklists
        - `e2e/` - Playwright flows
        - `tests/` - cross-package integration tests
        ''',
    )

    write_file(
        "CHANGELOG.md",
        r'''
        # Changelog

        ## 0.9.0

        - Migrated backend data access from Prisma to direct Supabase access through `@supabase/supabase-js`.
        - Added Supabase SQL core schema migration with transactional RPC functions.
        - Replaced Supabase Storage S3 presigning with Supabase Storage signed upload URLs.
        - Removed Prisma schema, migration scripts, and package scripts.

        ## 0.8.0

        - Approved Supabase as Pacta's backend platform.
        - Added Supabase Postgres environment configuration and Prisma `DIRECT_URL` support.
        - Switched evidence storage integration to support Supabase Storage S3-compatible signed uploads.
        - Added Supabase setup automation, storage bucket migration, and deployment documentation.

        ## 0.7.0

        - Added the authenticated Pacta frontend workflow for wallet login, dashboard, covenant creation, evidence, bond registration, evaluation requests, and reputation profiles.
        - Added StudioNet-safe GenLayer chain configuration for backend and frontend adapters.
        - Added CSRF protection, global API rate limiting, request ids, and backend tests.
        - Added local runtime automation for PostgreSQL, Prisma migrations, and dev server startup.

        ## 0.6.0

        - Wired deployed StudioNet contract address `0x6a7d7807612a5485e83E53c776fcfe35fE685C59` through Pacta configuration.
        - Added backend GenLayer module for contract reads and event synchronization.
        - Added frontend GenLayer client utilities for read and wallet-signed write flows.
        - Updated API and deployment documentation for post-deployment integration.

        ## 0.5.1

        - Rewrote the Pacta GenLayer contract with schema-friendly public signatures.
        - Replaced dataclass/list public read surfaces with JSON string reads.
        - Added static tests guarding against schema-hostile contract patterns.

        ## 0.5.0

        - Added the production-oriented Pacta GenLayer Intelligent Contract.
        - Renamed the contract file to `pacta_covenant_registry.py`.
        - Added contract API documentation, StudioNet deployment instructions, and static contract tests.
        - Added persistent event-log sync design for backend integration.

        ## 0.4.0

        - Added bond position APIs for submitted GEN bond transactions.
        - Added covenant evaluation request transition.
        - Added internal contract-event ingestion with idempotent event storage.
        - Added reputation profile read model.
        - Added internal API token configuration.

        ## 0.3.0

        - Renamed the project to Pacta.
        - Marked backend hosting as requiring explicit user approval.
        - Added R2-compatible evidence upload URL generation.
        - Added evidence metadata registration and listing endpoints.
        - Added storage and evidence NestJS modules.

        ## 0.2.0

        - Added NestJS database, audit, users, auth, and covenants modules.
        - Implemented wallet nonce generation, signature verification, server-side sessions, and logout.
        - Added first authenticated covenant creation and read APIs.
        - Added initial Prisma migration SQL.
        - Updated API, database, and security documentation.

        ## 0.1.0

        - Initial production-grade repository scaffold.
        - Added architecture, PRD, database, security, deployment, and testing documentation.
        - Added frontend, backend, contract, database, shared, monitoring, infra, and CI foundations.
        ''',
    )


if __name__ == "__main__":
    main()
