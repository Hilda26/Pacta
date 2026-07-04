import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { RequestContextInterceptor } from "../common/interceptors/request-context.interceptor";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BondsModule } from "./bonds/bonds.module";
import { ContractEventsModule } from "./contract-events/contract-events.module";
import { CovenantsModule } from "./covenants/covenants.module";
import { DatabaseModule } from "./database/database.module";
import { EvidenceModule } from "./evidence/evidence.module";
import { GenLayerModule } from "./genlayer/genlayer.module";
import { HealthModule } from "./health/health.module";
import { ReputationModule } from "./reputation/reputation.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../.env", ".env"] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get<string>("RATE_LIMIT_TTL_MS") ?? 60000),
          limit: Number(config.get<string>("RATE_LIMIT_MAX_REQUESTS") ?? 120)
        }
      ]
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>("LOG_LEVEL") ?? "info",
          redact: {
            paths: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
            censor: "[redacted]"
          },
                  genReqId: (request) => {
                    const headerValue = request.headers["x-request-id"];
                    return typeof headerValue === "string" && headerValue.length <= 128 ? headerValue : randomUUID();
                  }
                }
              })
    }),
    DatabaseModule,
    AuditModule,
    UsersModule,
    AuthModule,
    StorageModule,
    CovenantsModule,
    EvidenceModule,
    BondsModule,
    ContractEventsModule,
    GenLayerModule,
    ReputationModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor
    }
  ]
})
export class AppModule {}
