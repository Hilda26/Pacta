import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class SyncContractEventsDto {
  @ApiPropertyOptional({ description: "First contract event id to poll. Defaults to the latest event window." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromEventId?: number;

  @ApiPropertyOptional({ description: "Maximum number of events to poll.", default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
