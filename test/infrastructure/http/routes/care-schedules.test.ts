import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import careSchedulesRoute from '$infrastructure/http/routes/care-schedules.js';
import type { CareSchedule } from '$domain/care-schedule.js';
import type { CareLog } from '$domain/care-log.js';
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

const plantId = '507f1f77bcf86cd799439013';
const BASE = `/plants/${plantId}/schedules`;

function buildApp() {
    const app = Fastify({ logger: false });

    const mockCareSchedulesService = {
        getByPlantId: vi.fn<(plantId: string) => Promise<CareSchedule[]>>(),
        getById: vi.fn<(id: string) => Promise<CareSchedule | null>>(),
        create: vi.fn<(data: object) => Promise<CareSchedule>>(),
        update: vi.fn<(id: string, data: object) => Promise<CareSchedule | null>>(),
        delete: vi.fn<(id: string) => Promise<boolean>>(),
        getDue: vi.fn(),
        setActive: vi.fn(),
    };

    const mockCareLogsService = {
        getByPlantId: vi.fn<(plantId: string, scheduleId?: string) => Promise<CareLog[]>>(),
        getById: vi.fn<(plantId: string, id: string) => Promise<CareLog | null>>(),
        create: vi.fn(),
        delete: vi.fn(),
    };

    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('careSchedulesService', mockCareSchedulesService as never);
    app.decorate('careLogsService', mockCareLogsService as never);
    // Register at the same prefix plants.ts would use
    app.register(careSchedulesRoute, { prefix: '/plants/:plantId/schedules' });

    return { app, mockCareSchedulesService, mockCareLogsService };
}

const schedule: CareSchedule = {
    id: '507f1f77bcf86cd799439011',
    userId: testUser.id,
    plantId,
    careTypeId: '507f1f77bcf86cd799439014',
    selectedOption: null,
    notes: null,
    dayOfWeek: [1, 3],
    dayOfMonth: [],
    months: [],
    nextDue: '2026-04-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /plants/:plantId/schedules', () => {
    const { app, mockCareSchedulesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with all schedules for the plant', async () => {
        mockCareSchedulesService.getByPlantId.mockResolvedValue([schedule]);

        const res = await app.inject({ method: 'GET', url: BASE });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([schedule]);
        expect(mockCareSchedulesService.getByPlantId).toHaveBeenCalledExactlyOnceWith(plantId);
    });
});

describe('GET /plants/:plantId/schedules/:scheduleId', () => {
    const { app, mockCareSchedulesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the schedule when found', async () => {
        mockCareSchedulesService.getById.mockResolvedValue(schedule);

        const res = await app.inject({ method: 'GET', url: `${BASE}/${schedule.id}` });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(schedule);
    });

    it('returns 404 when not found', async () => {
        mockCareSchedulesService.getById.mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: `${BASE}/${schedule.id}` });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when scheduleId is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: `${BASE}/not-valid` });

        expect(res.statusCode).toBe(400);
        expect(mockCareSchedulesService.getById).not.toHaveBeenCalled();
    });
});

describe('POST /plants/:plantId/schedules', () => {
    const { app, mockCareSchedulesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 with the created schedule and a Location header', async () => {
        mockCareSchedulesService.create.mockResolvedValue(schedule);

        const res = await app.inject({
            method: 'POST',
            url: BASE,
            payload: { careTypeId: schedule.careTypeId, dayOfWeek: [1, 3] },
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual(schedule);
        expect(res.headers['location']).toBe(`/plants/${plantId}/schedules/${schedule.id}`);
    });

    it('defaults recurrence arrays to [] when omitted', async () => {
        mockCareSchedulesService.create.mockResolvedValue(schedule);

        await app.inject({
            method: 'POST',
            url: BASE,
            payload: { careTypeId: schedule.careTypeId },
        });

        expect(mockCareSchedulesService.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ dayOfWeek: [], dayOfMonth: [], months: [] })
        );
    });

    it('returns 400 when careTypeId is missing', async () => {
        const res = await app.inject({ method: 'POST', url: BASE, payload: {} });

        expect(res.statusCode).toBe(400);
        expect(mockCareSchedulesService.create).not.toHaveBeenCalled();
    });
});

describe('PATCH /plants/:plantId/schedules/:scheduleId', () => {
    const { app, mockCareSchedulesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the updated schedule', async () => {
        const updated = { ...schedule, notes: 'updated' };
        mockCareSchedulesService.update.mockResolvedValue(updated);

        const res = await app.inject({
            method: 'PATCH',
            url: `${BASE}/${schedule.id}`,
            payload: { notes: 'updated' },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(updated);
    });

    it('returns 404 when not found', async () => {
        mockCareSchedulesService.update.mockResolvedValue(null);

        const res = await app.inject({
            method: 'PATCH',
            url: `${BASE}/${schedule.id}`,
            payload: { notes: 'updated' },
        });

        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /plants/:plantId/schedules/:scheduleId', () => {
    const { app, mockCareSchedulesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 when deleted', async () => {
        mockCareSchedulesService.delete.mockResolvedValue(true);

        const res = await app.inject({ method: 'DELETE', url: `${BASE}/${schedule.id}` });

        expect(res.statusCode).toBe(204);
    });

    it('returns 404 when not found', async () => {
        mockCareSchedulesService.delete.mockResolvedValue(false);

        const res = await app.inject({ method: 'DELETE', url: `${BASE}/${schedule.id}` });

        expect(res.statusCode).toBe(404);
    });
});
