import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import careLogsRoute from '$infrastructure/http/routes/care-logs.js';
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
const scheduleId = '507f1f77bcf86cd799439015';
const PLANT_BASE = `/plants/${plantId}/logs`;
const SCHEDULE_BASE = `/plants/${plantId}/schedules/${scheduleId}/logs`;

function buildMockService() {
    return {
        getByPlantId: vi.fn<(userId: string, plantId: string, scheduleId?: string) => Promise<CareLog[]>>(),
        getById: vi.fn<(userId: string, plantId: string, id: string) => Promise<CareLog | null>>(),
        create: vi.fn<(data: object) => Promise<CareLog | null>>(),
        delete: vi.fn<(userId: string, plantId: string, id: string) => Promise<boolean>>(),
    };
}

function buildAdHocApp() {
    const app = Fastify({ logger: false });
    const mockCareLogsService = buildMockService();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('careLogsService', mockCareLogsService as never);
    app.register(careLogsRoute, { prefix: '/plants/:plantId/logs', scheduleContext: false });
    return { app, mockCareLogsService };
}

function buildScheduledApp() {
    const app = Fastify({ logger: false });
    const mockCareLogsService = buildMockService();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('careLogsService', mockCareLogsService as never);
    app.register(careLogsRoute, {
        prefix: '/plants/:plantId/schedules/:scheduleId/logs',
        scheduleContext: true,
    });
    return { app, mockCareLogsService };
}

const log: CareLog = {
    id: '507f1f77bcf86cd799439011',
    userId: testUser.id,
    plantId,
    scheduleId: null,
    careTypeId: '507f1f77bcf86cd799439014',
    selectedOption: null,
    notes: null,
    performedAt: '2026-03-31T10:00:00.000Z',
    createdAt: '2026-03-31T10:00:00.000Z',
};

// --- Ad-hoc context (/plants/:plantId/logs) ---

describe('GET /plants/:plantId/logs', () => {
    const { app, mockCareLogsService } = buildAdHocApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with all logs for the plant', async () => {
        mockCareLogsService.getByPlantId.mockResolvedValue([log]);

        const res = await app.inject({ method: 'GET', url: PLANT_BASE });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([log]);
        expect(mockCareLogsService.getByPlantId).toHaveBeenCalledExactlyOnceWith(
            testUser.id,
            plantId,
            undefined
        );
    });
});

describe('GET /plants/:plantId/logs/:logId', () => {
    const { app, mockCareLogsService } = buildAdHocApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the log when found', async () => {
        mockCareLogsService.getById.mockResolvedValue(log);

        const res = await app.inject({ method: 'GET', url: `${PLANT_BASE}/${log.id}` });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(log);
    });

    it('returns 404 when not found', async () => {
        mockCareLogsService.getById.mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: `${PLANT_BASE}/${log.id}` });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when logId is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: `${PLANT_BASE}/not-valid` });

        expect(res.statusCode).toBe(400);
        expect(mockCareLogsService.getById).not.toHaveBeenCalled();
    });
});

describe('POST /plants/:plantId/logs (ad-hoc)', () => {
    const { app, mockCareLogsService } = buildAdHocApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 with the created log and a Location header', async () => {
        mockCareLogsService.create.mockResolvedValue(log);

        const res = await app.inject({
            method: 'POST',
            url: PLANT_BASE,
            payload: { careTypeId: log.careTypeId },
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual(log);
        expect(res.headers['location']).toBe(`${PLANT_BASE}/${log.id}`);
        expect(mockCareLogsService.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ scheduleId: null, careTypeId: log.careTypeId })
        );
    });

    it('returns 400 when careTypeId is missing', async () => {
        const res = await app.inject({ method: 'POST', url: PLANT_BASE, payload: {} });

        expect(res.statusCode).toBe(400);
        expect(mockCareLogsService.create).not.toHaveBeenCalled();
    });
});

describe('DELETE /plants/:plantId/logs/:logId', () => {
    const { app, mockCareLogsService } = buildAdHocApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 when deleted', async () => {
        mockCareLogsService.delete.mockResolvedValue(true);

        const res = await app.inject({ method: 'DELETE', url: `${PLANT_BASE}/${log.id}` });

        expect(res.statusCode).toBe(204);
    });

    it('returns 404 when not found', async () => {
        mockCareLogsService.delete.mockResolvedValue(false);

        const res = await app.inject({ method: 'DELETE', url: `${PLANT_BASE}/${log.id}` });

        expect(res.statusCode).toBe(404);
    });
});

// --- Schedule-nested context (/plants/:plantId/schedules/:scheduleId/logs) ---

describe('GET /plants/:plantId/schedules/:scheduleId/logs', () => {
    const { app, mockCareLogsService } = buildScheduledApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with logs filtered by scheduleId', async () => {
        const scheduledLog = { ...log, scheduleId };
        mockCareLogsService.getByPlantId.mockResolvedValue([scheduledLog]);

        const res = await app.inject({ method: 'GET', url: SCHEDULE_BASE });

        expect(res.statusCode).toBe(200);
        expect(mockCareLogsService.getByPlantId).toHaveBeenCalledExactlyOnceWith(
            testUser.id,
            plantId,
            scheduleId
        );
    });
});

describe('POST /plants/:plantId/schedules/:scheduleId/logs (scheduled)', () => {
    const { app, mockCareLogsService } = buildScheduledApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 when careTypeId is omitted (resolved from schedule)', async () => {
        const scheduledLog = { ...log, scheduleId };
        mockCareLogsService.create.mockResolvedValue(scheduledLog);

        const res = await app.inject({ method: 'POST', url: SCHEDULE_BASE, payload: {} });

        expect(res.statusCode).toBe(201);
        expect(res.headers['location']).toBe(
            `/plants/${plantId}/schedules/${scheduleId}/logs/${scheduledLog.id}`
        );
        expect(mockCareLogsService.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ scheduleId, careTypeId: undefined })
        );
    });

    it('returns 201 when careTypeId is explicitly provided', async () => {
        const scheduledLog = { ...log, scheduleId };
        mockCareLogsService.create.mockResolvedValue(scheduledLog);

        const res = await app.inject({
            method: 'POST',
            url: SCHEDULE_BASE,
            payload: { careTypeId: log.careTypeId },
        });

        expect(res.statusCode).toBe(201);
        expect(mockCareLogsService.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ scheduleId, careTypeId: log.careTypeId })
        );
    });

    it('returns 404 when the service returns null (schedule not found)', async () => {
        mockCareLogsService.create.mockResolvedValue(null);

        const res = await app.inject({ method: 'POST', url: SCHEDULE_BASE, payload: {} });

        expect(res.statusCode).toBe(404);
    });
});
