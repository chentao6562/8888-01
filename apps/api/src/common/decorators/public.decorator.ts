import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记不需要鉴权的接口。 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
