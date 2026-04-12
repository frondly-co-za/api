import { describe, it, expect, vi, afterAll, beforeAll, beforeEach } from 'vitest';
import type { CareSchedule } from '$domain/care-schedule.js';
import type { CareLog } from '$domain/care-log.js';

beforeAll(() => { process.env.PHOTO_SIGNING_SECRET = 'test-signing-secret'; });
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import plantsRoute from '$infrastructure/http/routes/plants.js';
import errorHandler from '$infrastructure/http/plugins/error-handler.js';
import type { Plant, PlantsRepository } from '$domain/plant.js';
import type { PhotosRepository } from '$domain/photo.js';
import type { PhotosService } from '$application/photos-service.js';
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
function buildApp({ withErrorHandler = false } = {}) {
    const app = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });

    const mockPlantsRepository: PlantsRepository = {
        findAll: vi.fn<(userId: string) => Promise<Plant[]>>(),
        findById: vi.fn<(userId: string, id: string) => Promise<Plant | null>>(),
        create: vi.fn(),
        update: vi.fn(),
        clearCoverPhoto: vi.fn(),
        delete: vi.fn(),
    };

    const mockPhotosRepository: PhotosRepository = {
        findAllByPlant: vi.fn(),
        findById: vi.fn(),
        findByIdPublic: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    };

    const mockPhotosService = {
        setCoverPhoto: vi.fn(),
        uploadToPlant: vi.fn(),
        delete: vi.fn(),
        getFile: vi.fn(),
    } as unknown as PhotosService;

    if (withErrorHandler) app.register(errorHandler);
    app.register(multipart);
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
        request.user = testUser;
    });
    app.decorate('plantsRepository', mockPlantsRepository as never);
    app.decorate('photosRepository', mockPhotosRepository as never);
    app.decorate('photosService', mockPhotosService as never);
    app.register(plantsRoute, { prefix: '/plants' });

    return { app, mockPlantsRepository };
}

const plant: Plant = {
    id: '507f1f77bcf86cd799439011',
    userId: testUser.id,
    name: 'Cactus',
    description: null,
    coverPhotoId: null,
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
        expect(res.json()).toMatchObject([plant]);
        expect(mockPlantsRepository.findAll).toHaveBeenCalledExactlyOnceWith(testUser.id, undefined);
    });

    it('returns coverPhotoUrl as null when coverPhotoId is null', async () => {
        vi.mocked(mockPlantsRepository.findAll).mockResolvedValue([plant]);

        const [result] = (await app.inject({ method: 'GET', url: '/plants' })).json();

        expect(result.coverPhotoUrl).toBeNull();
    });

    it('returns a signed coverPhotoUrl when coverPhotoId is set', async () => {
        const plantWithCover = { ...plant, coverPhotoId: plant.id };
        vi.mocked(mockPlantsRepository.findAll).mockResolvedValue([plantWithCover]);

        const [result] = (await app.inject({ method: 'GET', url: '/plants' })).json();

        expect(result.coverPhotoUrl).toMatch(
            new RegExp(`^/photos/${plant.id}\\?expires=\\d+&sig=[a-f0-9]{64}$`)
        );
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
        expect(res.json()).toMatchObject(plant);
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

describe('POST /plants — mass-assignment rejection', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 400 when body contains unknown fields', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { name: 'Cactus', userId: 'injected', createdAt: '2020-01-01T00:00:00.000Z' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.create).not.toHaveBeenCalled();
    });
});

describe('PATCH /plants/:plantId', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the updated plant', async () => {
        const updated = { ...plant, name: 'Updated Cactus' };
        vi.mocked(mockPlantsRepository.update).mockResolvedValue(updated);

        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { name: 'Updated Cactus' },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toMatchObject(updated);
        expect(mockPlantsRepository.update).toHaveBeenCalledExactlyOnceWith(
            testUser.id,
            '507f1f77bcf86cd799439011',
            { name: 'Updated Cactus' }
        );
    });

    it('returns 404 when no plant has that id', async () => {
        vi.mocked(mockPlantsRepository.update).mockResolvedValue(null);

        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { name: 'Updated Cactus' },
        });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when name exceeds 256 characters', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { name: 'a'.repeat(257) },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when notes exceeds 1000 characters', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { notes: 'a'.repeat(1001) },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when body contains unknown fields', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { name: 'Cactus', unknownField: 'value' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when coverPhotoId is sent (protected — use /cover endpoint)', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { coverPhotoId: '507f1f77bcf86cd799439099' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when userId is sent (protected field)', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { userId: 'injected' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.update).not.toHaveBeenCalled();
    });

    it('returns 400 when createdAt is sent (protected field)', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/plants/507f1f77bcf86cd799439011',
            payload: { createdAt: '2020-01-01T00:00:00.000Z' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.update).not.toHaveBeenCalled();
    });
});

describe('DELETE /plants/:plantId', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 when the plant is deleted', async () => {
        vi.mocked(mockPlantsRepository.delete).mockResolvedValue(true);

        const res = await app.inject({
            method: 'DELETE',
            url: '/plants/507f1f77bcf86cd799439011',
        });

        expect(res.statusCode).toBe(204);
        expect(mockPlantsRepository.delete).toHaveBeenCalledExactlyOnceWith(
            testUser.id,
            '507f1f77bcf86cd799439011'
        );
    });

    it('returns 404 when no plant has that id', async () => {
        vi.mocked(mockPlantsRepository.delete).mockResolvedValue(false);

        const res = await app.inject({
            method: 'DELETE',
            url: '/plants/507f1f77bcf86cd799439011',
        });

        expect(res.statusCode).toBe(404);
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
        expect(res.json()).toMatchObject(plant);
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

    it('returns 400 when name exceeds 256 characters', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { name: 'a'.repeat(257) },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 when notes exceeds 1000 characters', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { name: 'Cactus', notes: 'a'.repeat(1001) },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.create).not.toHaveBeenCalled();
    });
});

describe('POST /plants — client-provided id', () => {
    const { app, mockPlantsRepository } = buildApp({ withErrorHandler: true });
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('passes optional id to the repository when provided', async () => {
        vi.mocked(mockPlantsRepository.create).mockResolvedValue(plant);

        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { id: plant.id, name: 'Cactus' },
        });

        expect(res.statusCode).toBe(201);
        expect(mockPlantsRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ id: plant.id })
        );
    });

    it('returns 400 when id is not a valid ObjectId', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { id: 'not-a-valid-oid', name: 'Cactus' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.create).not.toHaveBeenCalled();
    });

    it('returns 409 when the repository throws a duplicate key error', async () => {
        const duplicateKeyError = Object.assign(new Error('duplicate key'), { code: 11000 });
        vi.mocked(mockPlantsRepository.create).mockRejectedValue(duplicateKeyError);

        const res = await app.inject({
            method: 'POST',
            url: '/plants',
            payload: { id: plant.id, name: 'Cactus' },
        });

        expect(res.statusCode).toBe(409);
    });
});

describe('PATCH /plants/:plantId — optimistic concurrency', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 409 when update returns null and plant still exists (conflict)', async () => {
        vi.mocked(mockPlantsRepository.update).mockResolvedValue(null);
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);

        const res = await app.inject({
            method: 'PATCH',
            url: `/plants/${plant.id}`,
            payload: { name: 'Updated', updatedAt: '2025-01-01T00:00:00.000Z' },
        });

        expect(res.statusCode).toBe(409);
        expect(mockPlantsRepository.findById).toHaveBeenCalledWith(testUser.id, plant.id);
    });

    it('returns 404 when update returns null and plant does not exist', async () => {
        vi.mocked(mockPlantsRepository.update).mockResolvedValue(null);
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(null);

        const res = await app.inject({
            method: 'PATCH',
            url: `/plants/${plant.id}`,
            payload: { name: 'Updated', updatedAt: '2025-01-01T00:00:00.000Z' },
        });

        expect(res.statusCode).toBe(404);
    });

    it('returns 404 without calling findById when updatedAt is not provided', async () => {
        vi.mocked(mockPlantsRepository.update).mockResolvedValue(null);

        const res = await app.inject({
            method: 'PATCH',
            url: `/plants/${plant.id}`,
            payload: { name: 'Updated' },
        });

        expect(res.statusCode).toBe(404);
        expect(mockPlantsRepository.findById).not.toHaveBeenCalled();
    });
});

describe('GET /plants — ?include= query', () => {
    const { app, mockPlantsRepository } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    const schedule: CareSchedule = {
        id: '507f1f77bcf86cd799439020',
        userId: testUser.id,
        plantId: plant.id,
        careTypeId: '507f1f77bcf86cd799439030',
        selectedOption: null,
        notes: null,
        dayOfWeek: [],
        dayOfMonth: [],
        months: [],
        nextDue: '2026-02-01T00:00:00.000Z',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const log: CareLog = {
        id: '507f1f77bcf86cd799439040',
        userId: testUser.id,
        plantId: plant.id,
        scheduleId: null,
        careTypeId: '507f1f77bcf86cd799439030',
        selectedOption: null,
        notes: null,
        performedAt: '2026-01-15T00:00:00.000Z',
        createdAt: '2026-01-15T00:00:00.000Z',
    };

    it('returns 400 for unknown include values', async () => {
        const res = await app.inject({ method: 'GET', url: '/plants?include=unknown' });

        expect(res.statusCode).toBe(400);
        expect(mockPlantsRepository.findAll).not.toHaveBeenCalled();
    });

    it('returns 400 when one of multiple include values is unknown', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/plants?include=schedules,invalid',
        });

        expect(res.statusCode).toBe(400);
    });

    it('calls findAll with parsed include array', async () => {
        vi.mocked(mockPlantsRepository.findAll).mockResolvedValue([plant]);

        const res = await app.inject({
            method: 'GET',
            url: '/plants?include=schedules,recentLogs',
        });

        expect(res.statusCode).toBe(200);
        expect(mockPlantsRepository.findAll).toHaveBeenCalledExactlyOnceWith(testUser.id, [
            'schedules',
            'recentLogs',
        ]);
    });

    it('returns embedded schedules and recentLogs when include is present', async () => {
        const enrichedPlant = { ...plant, schedules: [schedule], recentLogs: [log] };
        vi.mocked(mockPlantsRepository.findAll).mockResolvedValue([enrichedPlant]);

        const res = await app.inject({
            method: 'GET',
            url: '/plants?include=schedules,recentLogs',
        });

        expect(res.statusCode).toBe(200);
        const [result] = res.json();
        expect(result.schedules).toHaveLength(1);
        expect(result.schedules[0].id).toBe(schedule.id);
        expect(result.recentLogs).toHaveLength(1);
        expect(result.recentLogs[0].id).toBe(log.id);
    });

    it('omits schedules and recentLogs from response when include is absent', async () => {
        vi.mocked(mockPlantsRepository.findAll).mockResolvedValue([plant]);

        const res = await app.inject({ method: 'GET', url: '/plants' });

        expect(res.statusCode).toBe(200);
        const [result] = res.json();
        expect(result.schedules).toBeUndefined();
        expect(result.recentLogs).toBeUndefined();
    });
});
