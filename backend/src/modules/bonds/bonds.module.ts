import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { BondsController } from "./bonds.controller";
import { BondsService } from "./bonds.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [BondsController],
  providers: [BondsService],
  exports: [BondsService]
})
export class BondsModule {}
