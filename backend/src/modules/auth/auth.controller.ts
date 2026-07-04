import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { CsrfGuard } from "../../common/guards/csrf.guard";
import { AuthenticatedUser, AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { CreateNonceDto } from "./dto/create-nonce.dto";
import { VerifyWalletDto } from "./dto/verify-wallet.dto";
import { SessionGuard } from "./session.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("nonce")
  createNonce(@Body() dto: CreateNonceDto) {
    return this.authService.createNonce(dto.walletAddress);
  }

  @Post("verify")
  async verify(@Body() dto: VerifyWalletDto, @Res({ passthrough: true }) response: any) {
    const result = await this.authService.verifyWalletSignature(dto);
    response.setHeader(
      "Set-Cookie",
      this.authService.buildSessionCookies(result.sessionToken, result.csrfToken, result.expiresAt)
    );

    return {
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
      csrfToken: result.csrfToken
    };
  }

  @ApiCookieAuth("pacta_session")
  @UseGuards(SessionGuard)
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @ApiCookieAuth("pacta_session")
  @UseGuards(SessionGuard, CsrfGuard)
  @Post("logout")
  async logout(@Req() request: any, @Res({ passthrough: true }) response: any) {
    await this.authService.logout(request.sessionToken);
    response.setHeader("Set-Cookie", this.authService.buildExpiredSessionCookies());
    return { ok: true };
  }
}
