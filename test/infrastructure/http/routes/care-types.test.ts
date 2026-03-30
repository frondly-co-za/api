import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import careTypesRoute from '$infrastructure/http/routes/care-types.js';
import type { CareType } from '$domain/care-type.js';
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

function buildApp() {
    const app = Fastify({ logger: false });

    const mockCareTypesService = {
        getAll: vi.fn<(userId: string) => Promise<CareType[]>>(),
        getById: vi.fn<(id: string) => Promise<CareType | null>>(),
        create: vi.fn<(data: object) => Promise<CareType>>(),
        update: vi.fn<(id: string, data: object) => Promise<CareType | null>>(),
        delete: vi.fn<(id: string) => Promise<boolean>>(),
    };

    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('careTypesService', mockCareTypesService as never);
    app.register(careTypesRoute, { prefix: '/care-types' });

    return { app, mockCareTypesService };
}

const careType: CareType = {
    id: '507f1f77bcf86cd799439011',
    userId: testUser.id,
    name: 'Watering',
    options: ['light', 'deep'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /care-types', () => {
    const { app, mockCareTypesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with all care types for the authenticated user', async () => {
        mockCareTypesService.getAll.mockResolvedValue([careType]);

        const res = await app.inject({ method: 'GET', url: '/care-types' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([careType]);
        expect(mockCareTypesService.getAll).toHaveBeenCalledExactlyOnceWith(testUser.id);
    });
});

describe('GET /care-types/:typeId', () => {
    const { app, mockCareTypesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the care type when found', async () => {
        mockCareTypesService.getById.mockResolvedValue(careType);

        const res = await app.inject({ method: 'GET', url: `/care-types/${careType.id}` });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(careType);
    });

    it('returns 404 when not found', async () => {
        mockCareTypesService.getById.mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: `/care-types/${careType.id}` });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when typeId is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: '/care-types/not-valid' });

        expect(res.statusCode).toBe(400);
        expect(mockCareTypesService.getById).not.toHaveBeenCalled();
    });
});

describe('POST /care-types', () => {
    const { app, mockCareTypesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 with the created care type and a Location header', async () => {
        mockCareTypesService.create.mockResolvedValue(careType);

        const res = await app.inject({
            method: 'POST',
            url: '/care-types',
            payload: { name: 'Watering', options: ['light', 'deep'] },
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual(careType);
        expect(res.headers['location']).toBe(`/care-types/${careType.id}`);
    });

    it('defaults options to [] when omitted', async () => {
        mockCareTypesService.create.mockResolvedValue(careType);

        await app.inject({ method: 'POST', url: '/care-types', payload: { name: 'Watering' } });

        expect(mockCareTypesService.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ options: [] })
        );
    });

    it('returns 400 when name is missing', async () => {
        const res = await app.inject({ method: 'POST', url: '/care-types', payload: {} });

        expect(res.statusCode).toBe(400);
        expect(mockCareTypesService.create).not.toHaveBeenCalled();
    });
});

describe('PATCH /care-types/:typeId', () => {
    const { app, mockCareTypesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the updated care type', async () => {
        const updated = { ...careType, name: 'Fertilising' };
        mockCareTypesService.update.mockResolvedValue(updated);

        const res = await app.inject({
            method: 'PATCH',
            url: `/care-types/${careType.id}`,
            payload: { name: 'Fertilising' },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(updated);
    });

    it('returns 404 when not found', async () => {
        mockCareTypesService.update.mockResolvedValue(null);

        const res = await app.inject({
            method: 'PATCH',
            url: `/care-types/${careType.id}`,
            payload: { name: 'Fertilising' },
        });

        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /care-types/:typeId', () => {
    const { app, mockCareTypesService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 when deleted', async () => {
        mockCareTypesService.delete.mockResolvedValue(true);

        const res = await app.inject({ method: 'DELETE', url: `/care-types/${careType.id}` });

        expect(res.statusCode).toBe(204);
    });

    it('returns 404 when not found', async () => {
        mockCareTypesService.delete.mockResolvedValue(false);

        const res = await app.inject({ method: 'DELETE', url: `/care-types/${careType.id}` });

        expect(res.statusCode).toBe(404);
    });
});
