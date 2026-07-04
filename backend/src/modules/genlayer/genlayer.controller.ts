import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { InternalApiGuard } from "../../common/guards/internal-api.guard";
import { SyncContractEventsDto } from "./dto/sync-contract-events.dto";
import { GenLayerService } from "./genlayer.service";

@ApiTags("genlayer")
@Controller("genlayer")
export class GenLayerController {
  constructor(private readonly genlayer: GenLayerService) {}

  @Get("config")
  config() {
    return this.genlayer.getPublicConfig();
  }

  @Get("contract/covenants/:id")
  readCovenant(@Param("id") id: string) {
    return this.genlayer.readJsonContractView("get_covenant", [id]);
  }

  @Get("contract/events/:eventId")
  readEvent(@Param("eventId") eventId: string) {
    return this.genlayer.readJsonContractView("get_event", [Number(eventId)]);
  }

  @Post("sync-events")
  @UseGuards(InternalApiGuard)
  @ApiHeader({ name: "x-pacta-internal-token", required: true })
  syncEvents(@Body() dto: SyncContractEventsDto) {
    return this.genlayer.syncContractEvents(dto);
  }
}
