"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("../src/app.module");
const all_exceptions_filter_1 = require("../src/common/filters/all-exceptions.filter");
const transform_interceptor_1 = require("../src/common/interceptors/transform.interceptor");
describe('GET /api/v1/health (e2e)', () => {
    let app;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, whitelist: true }));
        app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
        app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    it('returns { data: { status: "ok", ts } }', async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer()).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('ok');
        expect(typeof res.body.data.ts).toBe('string');
    });
});
//# sourceMappingURL=health.e2e-spec.js.map