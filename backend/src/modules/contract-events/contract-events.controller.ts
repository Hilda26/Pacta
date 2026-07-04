import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { InternalApiGuard } from "../../common/guards/internal-api.guard";
import { ContractEventsService } from "./contract-events.service";
import { IngestContractEventDto } from "./dto/ingest-contract-event.dto";

@ApiTags("contract-events")
@Controller("contract-events")
export class ContractEventsController {
  constructor(private readonly contractEvents: ContractEventsService) {}

  @Post()
  @UseGuards(InternalApiGuard)
  @ApiHeader({ name: "x-pacta-internal-token", required: true })
  ingest(@Body() dto: IngestContractEventDto) {
    return this.contractEvents.ingest(dto);
  }
}
