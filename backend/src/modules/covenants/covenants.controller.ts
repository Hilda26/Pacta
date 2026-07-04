import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { CsrfGuard } from "../../common/guards/csrf.guard";
import { AuthenticatedUser } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { CovenantsService } from "./covenants.service";
import { CreateCovenantDto } from "./dto/create-covenant.dto";
import { SubmitEvaluationDto } from "./dto/submit-evaluation.dto";

@ApiTags("covenants")
@ApiCookieAuth("pacta_session")
@UseGuards(SessionGuard, CsrfGuard)
@Controller("covenants")
export class CovenantsController {
  constructor(private readonly covenants: CovenantsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCovenantDto) {
    return this.covenants.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.covenants.listForUser(user);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.covenants.getForUser(user, id);
  }

  @Post(":id/submit-evaluation")
  submitEvaluation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SubmitEvaluationDto
  ) {
    return this.covenants.submitEvaluation(user, id, dto);
  }
}
