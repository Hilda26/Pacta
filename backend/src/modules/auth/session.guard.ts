import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const sessionToken = this.authService.extractSessionToken(request);
    request.sessionToken = sessionToken;
    request.user = await this.authService.authenticateSession(sessionToken);
    return true;
  }
}
