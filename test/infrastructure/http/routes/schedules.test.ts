import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import schedulesRoute from '$infrastructure/http/routes/schedules.js';
import type { CareSchedule } from '$domain/care-schedule.js';
import type { User } from '$domain/user.js';

const testUser: User = {
    id: '507f1f77bcf86cd799439012',
    auth0Sub: 'auth0|test',
    email: 'test@example.com',
    name: 'Test User',
    timezone: 'Africa/Johannesburg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

const schedule: CareSchedule = {
    id: '507f1f77bcf86cd799439011',
    userId: testUser.id,
    plantId: '507f1f77bcf86cd799439013',
    careTypeId: '507f1f77bcf86cd799439014',
    selectedOption: null,
    notes: null,
    dayOfWeek: [1],
    dayOfMonth: [],
    months: [],
    nextDue: '2026-04-07T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

function buildApp() {
    const app = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });

    const mockCareSchedulesService = {
        getDue: vi.fn<(userId: string, asOf: string) => Promise<CareSchedule[]>>(),
    };

    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('careSchedulesService', mockCareSchedulesService as never);
    app.register(schedulesRoute, { prefix: '/schedules' });

    return { app, mockCareSchedulesService };
}

describe('GET /schedules/due', () => {
    const { app, mockCareSchedulesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with due schedules for the given asOf', async () => {
        vi.mocked(mockCareSchedulesService.getDue).mockResolvedValue([schedule]);

        const asOf = '2026-04-01T00:00:00.000Z';
        const res = await app.inject({ method: 'GET', url: `/schedules/due?asOf=${asOf}` });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([schedule]);
        expect(mockCareSchedulesService.getDue).toHaveBeenCalledExactlyOnceWith(testUser.id, asOf);
    });

    it('defaults asOf to now when not provided', async () => {
        vi.mocked(mockCareSchedulesService.getDue).mockResolvedValue([]);

        const before = new Date().toISOString();
        const res = await app.inject({ method: 'GET', url: '/schedules/due' });
        const after = new Date().toISOString();

        expect(res.statusCode).toBe(200);
        const calledWith = vi.mocked(mockCareSchedulesService.getDue).mock.calls[0][1];
        expect(calledWith >= before && calledWith <= after).toBe(true);
    });

    it('returns 400 when asOf is not a valid date-time', async () => {
        const res = await app.inject({ method: 'GET', url: '/schedules/due?asOf=not-a-date' });

        expect(res.statusCode).toBe(400);
        expect(mockCareSchedulesService.getDue).not.toHaveBeenCalled();
    });
});
