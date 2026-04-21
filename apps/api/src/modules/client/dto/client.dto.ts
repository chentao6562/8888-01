import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  @MaxLength(120)
  code!: string;
}

export class BindPhoneDto {
  @IsString()
  @MaxLength(2048)
  tempToken!: string;

  @Matches(/^1[3-9]\d{9}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  verifyCode?: string;
}

export class DevLoginDto {
  @Matches(/^1[3-9]\d{9}$/)
  phone!: string;
}

export class AddVideoCommentDto {
  @IsNumber()
  @Min(0)
  @Max(86400)
  timestamp!: number;

  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  author?: string;
}

export class ReviewVideoDto {
  @IsIn(['approve', 'minor_change', 'reshoot'])
  action!: 'approve' | 'minor_change' | 'reshoot';
}

export class ClientNpsDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  reportId?: string;

  @IsInt()
  @Min(0)
  @Max(10)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class ClientComplaintDto {
  @IsOptional()
  @IsIn(['low', 'mid', 'high'])
  severity?: 'low' | 'mid' | 'high';

  @IsString()
  @MaxLength(5000)
  content!: string;
}

export class UploadVoucherDto {
  @IsString()
  @MaxLength(500)
  voucherUrl!: string;
}

export class InvoiceRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  contractId?: string;

  @IsOptional()
  @IsArray()
  paymentIds?: string[];

  @IsString()
  @MaxLength(200)
  invoiceTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string;

  @IsOptional()
  @IsIn(['general', 'special'])
  invoiceType?: 'general' | 'special';

  @IsOptional()
  @IsString()
  @MaxLength(400)
  mailAddress?: string;
}
