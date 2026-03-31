import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import plantsRoute from '$infrastructure/http/routes/plants.js';
import type { Plant, PlantsRepository } from '$domain/plant.js';
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

/**
 * Build a minimal Fastify app with the plants route and a mocked plantsRepository.
 * No DB or real plugins are loaded — we decorate directly before registering routes.
 * request.user is set via a preHandler, mirroring what the real auth plugin does.
 */
function buildApp() {
    const app = Fastify({ logger: false });

    const mockPlantsRepository: PlantsRepository = {
        findAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
    };

    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
        request.user = testUser;
    });
    app.decorate('plantsRepository', mockPlantsRepository as never);
    app.register(plantsRoute, { prefix: '/plants' });

    return { app, mockPlantsRepository };
}

const plant: Plant = {
    id: '507f1f77bcf86cd799439011',
    userId: testUser.id,
    name: 'Cactus',
    description: null,
    photoUrl: null,
    acquiredAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /plants', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with all plants for the authenticated user', async () => {
        vi.mocked(mockPlantsRepository.findAll).mockResolvedValue([plant]);

        const res = await app.inject({ method: 'GET', url: '/plants' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([plant]);
        expect(mockPlantsRepository.findAll).toHaveBeenCalledExactlyOnceWith(testUser.id);
    });
});

describe('GET /plants/:plantId', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the plant when found', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);

        const res = await app.inject({ method: 'GET', url: '/plants/507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(plant);
    });

    it('returns 404 when no plant has that id', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: '/plants/507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when id is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: '/plants/not-a-valid-id' });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.findById).not.toHaveBeenCalled();
    });
});

describe('POST /plants', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 with the created plant and a Location header', async () => {
        vi.mocked(mockPlantsRepository.create).mockResolvedValue(plant);

        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { name: 'Cactus' },
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual(plant);
        expect(res.headers['location']).toBe('/plants/507f1f77bcf86cd799439011');
    });

    it('returns 400 when the request body is missing name', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: {},
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.create).not.toHaveBeenCalled();
    });
});
