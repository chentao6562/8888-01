import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('returns status ok with ISO timestamp', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(typeof result.ts).toBe('string');
    expect(Number.isNaN(Date.parse(result.ts))).toBe(false);
  });
});
