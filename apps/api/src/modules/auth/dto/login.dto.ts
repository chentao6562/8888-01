import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '13800001234' })
  @Matches(/^1[3-9]\d{9}$/, { message: 'phone 必须为 11 位手机号' })
  phone!: string;

  @ApiProperty({ example: 'P@ssw0rd' })
  @IsString()
  @Length(1, 64)
  password!: string;
}
