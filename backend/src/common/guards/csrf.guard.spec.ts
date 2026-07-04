import { UnauthorizedException } from "@nestjs/common";
import { CsrfGuard } from "./csrf.guard";

function context(method: string, cookie?: string, header?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: {
          cookie,
          "x-pacta-csrf": header
        }
      })
    })
  } as any;
}

describe("CsrfGuard", () => {
  it("allows safe methods without a token", () => {
    const guard = new CsrfGuard();
    expect(guard.canActivate(context("GET"))).toBe(true);
  });

  it("allows matching cookie and header tokens", () => {
    const guard = new CsrfGuard();
    expect(guard.canActivate(context("POST", "pacta_csrf=abc123", "abc123"))).toBe(true);
  });

  it("rejects missing or mismatched tokens", () => {
    const guard = new CsrfGuard();
    expect(() => guard.canActivate(context("POST", "pacta_csrf=abc123", "different"))).toThrow(UnauthorizedException);
  });
});
