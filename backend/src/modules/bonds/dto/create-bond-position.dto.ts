import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateBondPositionDto {
  @ApiProperty({ example: "10.0" })
  @Matches(/^\d+(\.\d+)?$/)
  amount!: string;

  @ApiProperty({ example: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" })
  @Matches(/^0x[a-fA-F0-9]{64}$/)
  txHash!: string;

  @ApiProperty({ enum: ["CREATOR", "CO_STAKER", "COUNTERPARTY"] })
  @IsIn(["CREATOR", "CO_STAKER", "COUNTERPARTY"])
  role!: "CREATOR" | "CO_STAKER" | "COUNTERPARTY";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  contractCovenantId?: string;
}
