import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard]
})
export class AuthModule {}
