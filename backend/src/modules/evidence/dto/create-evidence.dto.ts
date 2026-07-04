import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional, IsString, IsUrl, Length, Matches } from "class-validator";

export const evidenceTypes = [
  "DOCUMENT",
  "GITHUB_COMMIT",
  "PAYMENT_RECEIPT",
  "PHOTO",
  "VIDEO",
  "API_RESPONSE",
  "ATTESTATION",
  "IOT_DEVICE_DATA",
  "SOCIAL_PROOF",
  "URL",
  "STRUCTURED_METADATA"
] as const;

export class CreateEvidenceDto {
  @ApiProperty({ enum: evidenceTypes })
  @IsIn(evidenceTypes)
  type!: (typeof evidenceTypes)[number];

  @ApiProperty({ example: "sha256:..." })
  @IsString()
  @Length(16, 180)
  contentHash!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 500)
  storageUri?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  structuredMetadata?: Record<string, unknown>;
}

export class CreateEvidenceUploadUrlDto {
  @ApiProperty()
  @IsString()
  @Length(1, 180)
  filename!: string;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  @Length(3, 120)
  contentType!: string;

  @ApiProperty()
  contentLength!: number;

  @ApiProperty({ example: "sha256:..." })
  @IsString()
  @Length(16, 180)
  @Matches(/^[a-z0-9:_-]+$/i)
  contentHash!: string;
}
