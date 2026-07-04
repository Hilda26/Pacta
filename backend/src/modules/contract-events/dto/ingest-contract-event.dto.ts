import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsObject, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class IngestContractEventDto {
  @ApiProperty({ example: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" })
  @Matches(/^0x[a-fA-F0-9]{64}$/)
  txHash!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  logIndex!: number;

  @ApiProperty({ example: "CovenantEvaluated" })
  @IsString()
  @Length(3, 80)
  eventName!: string;

  @ApiProperty()
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  source?: string;
}
