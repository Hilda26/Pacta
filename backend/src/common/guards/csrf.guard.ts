import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfCookieName = "pacta_csrf";
  private readonly csrfHeaderName = "x-pacta-csrf";

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const cookieToken = this.readCookie(request.headers?.cookie, this.csrfCookieName);
    const headerToken = request.headers?.[this.csrfHeaderName];
    if (!cookieToken || typeof headerToken !== "string") {
      throw new UnauthorizedException("Missing CSRF token.");
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
      throw new UnauthorizedException("Invalid CSRF token.");
    }

    return true;
  }

  private readCookie(cookieHeader: unknown, name: string) {
    if (typeof cookieHeader !== "string") {
      return undefined;
    }

    const cookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
  }
}
