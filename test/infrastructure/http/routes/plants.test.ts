import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import plantsRoute from '$infrastructure/http/routes/plants.js';
import type { Plant } from '$domain/plant.js';

/**
 * Build a minimal Fastify app with the plants route and a mocked plantsService.
 * No DB or real plugins are loaded — we decorate directly before registering routes.
 */
function buildApp() {
    const app = Fastify({ logger: false });

    const mockPlantsService = {
        getAll: vi.fn<(userId: string) => Promise<Plant[]>>(),
        getById: vi.fn<(id: string) => Promise<Plant | null>>(),
        create: vi.fn<(data: object) => Promise<Plant>>(),
    };

    // Decorate before registering routes so the plugin can access it
    app.decorate('plantsService', mockPlantsService as never);
    app.register(plantsRoute, { prefix: '/plants' });

    return { app, mockPlantsService };
}

const userId = '507f1f77bcf86cd799439012';

const plant: Plant = {
    id: '507f1f77bcf86cd799439011',
    userId,
    name: 'Cactus',
    description: null,
    photoUrl: null,
    acquiredAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /plants', () => {
    const { app, mockPlantsService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with all plants for the given userId', async () => {
        mockPlantsService.getAll.mockResolvedValue([plant]);

        const res = await app.inject({ method: 'GET', url: `/plants?userId=${userId}` });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([plant]);
        expect(mockPlantsService.getAll).toHaveBeenCalledExactlyOnceWith(userId);
    });

    it('returns 400 when userId query param is missing', async () => {
        const res = await app.inject({ method: 'GET', url: '/plants' });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsService.getAll).not.toHaveBeenCalled();
    });
});

describe('GET /plants/:id', () => {
    const { app, mockPlantsService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the plant when found', async () => {
        mockPlantsService.getById.mockResolvedValue(plant);

        const res = await app.inject({ method: 'GET', url: '/plants/507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(plant);
    });

    it('returns 404 when no plant has that id', async () => {
        mockPlantsService.getById.mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: '/plants/507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when id is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: '/plants/not-a-valid-id' });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsService.getById).not.toHaveBeenCalled();
    });
});

describe('POST /plants', () => {
    const { app, mockPlantsService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 with the created plant and a Location header', async () => {
        mockPlantsService.create.mockResolvedValue(plant);

        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { userId, name: 'Cactus' },
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual(plant);
        expect(res.headers['location']).toBe('/plants/507f1f77bcf86cd799439011');
    });

    it('returns 400 when the request body is missing name', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { userId },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when the request body is missing userId', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { name: 'Cactus' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsService.create).not.toHaveBeenCalled();
    });
});
