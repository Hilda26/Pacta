import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ContractEventsController } from "./contract-events.controller";
import { ContractEventsService } from "./contract-events.service";

@Module({
  imports: [AuditModule],
  controllers: [ContractEventsController],
  providers: [ContractEventsService],
  exports: [ContractEventsService]
})
export class ContractEventsModule {}
