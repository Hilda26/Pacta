import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { CsrfGuard } from "../../common/guards/csrf.guard";
import { AuthenticatedUser } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { BondsService } from "./bonds.service";
import { CreateBondPositionDto } from "./dto/create-bond-position.dto";

@ApiTags("bonds")
@ApiCookieAuth("pacta_session")
@UseGuards(SessionGuard, CsrfGuard)
@Controller("covenants/:covenantId/bonds")
export class BondsController {
  constructor(private readonly bonds: BondsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("covenantId") covenantId: string,
    @Body() dto: CreateBondPositionDto
  ) {
    return this.bonds.create(user, covenantId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("covenantId") covenantId: string) {
    return this.bonds.list(user, covenantId);
  }
}
