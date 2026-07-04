import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { CovenantsController } from "./covenants.controller";
import { CovenantsService } from "./covenants.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [CovenantsController],
  providers: [CovenantsService],
  exports: [CovenantsService]
})
export class CovenantsModule {}
