import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class SubmitEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  contractCovenantId?: string;
}
