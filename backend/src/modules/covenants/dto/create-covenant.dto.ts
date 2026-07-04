import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsObject, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateCovenantDto {
  @ApiProperty()
  @IsString()
  @Length(3, 120)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  promise!: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  successCriteria!: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  evidenceRequirements!: string;

  @ApiProperty()
  @IsDateString()
  deadlineAt!: string;

  @ApiProperty({ example: "10.0" })
  @Matches(/^\d+(\.\d+)?$/)
  requiredBondAmount!: string;

  @ApiProperty({ enum: ["PRIVATE", "UNLISTED", "PUBLIC"] })
  @IsIn(["PRIVATE", "UNLISTED", "PUBLIC"])
  privacy!: "PRIVATE" | "UNLISTED" | "PUBLIC";

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
