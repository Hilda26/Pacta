import { ApiProperty } from "@nestjs/swagger";
import { IsEthereumAddress, IsString, Length } from "class-validator";

export class VerifyWalletDto {
  @ApiProperty({ example: "0x0000000000000000000000000000000000000000" })
  @IsEthereumAddress()
  walletAddress!: string;

  @ApiProperty()
  @IsString()
  @Length(16, 256)
  nonce!: string;

  @ApiProperty()
  @IsString()
  @Length(65, 512)
  signature!: string;
}
