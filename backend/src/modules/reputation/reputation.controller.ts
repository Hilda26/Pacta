import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ReputationService } from "./reputation.service";

@ApiTags("reputation")
@Controller("reputation")
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get(":walletAddress")
  get(@Param("walletAddress") walletAddress: string) {
    return this.reputation.getPublicProfile(walletAddress);
  }
}
