import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { CsrfGuard } from "../../common/guards/csrf.guard";
import { AuthenticatedUser } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { CreateEvidenceDto, CreateEvidenceUploadUrlDto } from "./dto/create-evidence.dto";
import { EvidenceService } from "./evidence.service";

@ApiTags("evidence")
@ApiCookieAuth("pacta_session")
@UseGuards(SessionGuard, CsrfGuard)
@Controller("covenants/:covenantId/evidence")
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post("upload-url")
  createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param("covenantId") covenantId: string,
    @Body() dto: CreateEvidenceUploadUrlDto
  ) {
    return this.evidence.createUploadUrl(user, covenantId, dto);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("covenantId") covenantId: string,
    @Body() dto: CreateEvidenceDto
  ) {
    return this.evidence.create(user, covenantId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("covenantId") covenantId: string) {
    return this.evidence.list(user, covenantId);
  }
}
