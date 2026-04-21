import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ example: '<48-hex chars>' })
  @IsString()
  @Length(10, 120)
  token!: string;

  @ApiProperty({ example: 'P@ssw0rd' })
  @IsString()
  @Length(8, 64)
  @Matches(/[A-Za-z]/, { message: '密码需包含字母' })
  @Matches(/\d/, { message: '密码需包含数字' })
  password!: string;
}
