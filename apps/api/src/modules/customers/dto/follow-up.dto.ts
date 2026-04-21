import { IsIn, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { FollowUpChannel } from '../entities/lead-follow-up.entity';

const CHANNELS: FollowUpChannel[] = ['call', 'wechat', 'visit', 'email', 'other'];

export class CreateFollowUpDto {
  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: FollowUpChannel;

  @ApiProperty({ example: '电话跟进，客户明天到店细聊' })
  @IsString()
  @Length(2, 500)
  notes!: string;
}
