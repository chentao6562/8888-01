import { IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type Dialect = 'standard' | 'hohhot' | 'dongbei';
export type CopyFramework = 'story' | 'contrast' | 'dryGoods';

export class CopywritingDto {
  @ApiProperty({ example: '本地 15 年老店的驾校', description: '卖点/主题' })
  @IsString()
  @Length(2, 500)
  sellingPoint!: string;

  @ApiPropertyOptional({ description: '证据（老客反馈 / 数据）', type: [String] })
  @IsOptional()
  @IsArray()
  evidence?: string[];

  @ApiPropertyOptional({ enum: ['story', 'contrast', 'dryGoods'] })
  @IsOptional()
  @IsIn(['story', 'contrast', 'dryGoods'])
  framework?: CopyFramework;

  @ApiPropertyOptional({ enum: ['standard', 'hohhot', 'dongbei'] })
  @IsOptional()
  @IsIn(['standard', 'hohhot', 'dongbei'])
  dialect?: Dialect;

  @ApiPropertyOptional({ description: '关联视频 id（可选，保存文案时用）' })
  @IsOptional()
  @IsString()
  videoId?: string;
}

export class TitlesDto {
  @ApiProperty({ example: '本地 15 年老店的驾校，通过率 90%' })
  @IsString()
  @Length(5, 500)
  summary!: string;

  @ApiPropertyOptional({ enum: ['standard', 'hohhot', 'dongbei'] })
  @IsOptional()
  @IsIn(['standard', 'hohhot', 'dongbei'])
  dialect?: Dialect;
}

export class TagsDto {
  @ApiProperty({ example: '抖音' })
  @IsString()
  platform!: string;

  @ApiProperty({ example: '本地 15 年老店的驾校' })
  @IsString()
  @Length(2, 500)
  content!: string;

  @ApiPropertyOptional({ description: '行业关键词' })
  @IsOptional()
  @IsString()
  industry?: string;
}

export class DialectAdaptDto {
  @ApiProperty({ example: '这家店很好，非常棒' })
  @IsString()
  @Length(2, 2000)
  text!: string;

  @ApiProperty({ enum: ['standard', 'hohhot', 'dongbei'] })
  @IsIn(['standard', 'hohhot', 'dongbei'])
  dialect!: Dialect;
}

export class SensitiveCheckDto {
  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  text!: string;
}
