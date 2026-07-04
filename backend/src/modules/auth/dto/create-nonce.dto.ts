import { ApiProperty } from "@nestjs/swagger";
import { IsEthereumAddress } from "class-validator";

export class CreateNonceDto {
  @ApiProperty({ example: "0x0000000000000000000000000000000000000000" })
  @IsEthereumAddress()
  walletAddress!: string;
}
