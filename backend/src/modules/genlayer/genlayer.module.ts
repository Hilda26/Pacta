import { Module } from "@nestjs/common";
import { InternalApiGuard } from "../../common/guards/internal-api.guard";
import { ContractEventsModule } from "../contract-events/contract-events.module";
import { GenLayerController } from "./genlayer.controller";
import { GenLayerService } from "./genlayer.service";

@Module({
  imports: [ContractEventsModule],
  controllers: [GenLayerController],
  providers: [GenLayerService, InternalApiGuard],
  exports: [GenLayerService]
})
export class GenLayerModule {}
