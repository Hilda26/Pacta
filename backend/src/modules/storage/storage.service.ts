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
