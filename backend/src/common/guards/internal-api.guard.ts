import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expectedToken = this.config.get<string>("INTERNAL_API_TOKEN");
    if (!expectedToken || expectedToken.startsWith("replace-with")) {
      throw new ServiceUnavailableException("Internal API token is not configured.");
    }

    const request = context.switchToHttp().getRequest();
    const providedToken = request.headers["x-pacta-internal-token"];
    if (typeof providedToken !== "string") {
      throw new UnauthorizedException("Missing internal API token.");
    }

    const expected = Buffer.from(expectedToken);
    const provided = Buffer.from(providedToken);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException("Invalid internal API token.");
    }

    return true;
  }
}
