import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { Readable } from 'stream';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import photosRoutes from '$infrastructure/http/routes/photos.js';
import type { Photo, PhotosRepository } from '$domain/photo.js';
import type { Plant, PlantsRepository } from '$domain/plant.js';
import type { PhotosService } from '$application/photos-service.js';
import type { User } from '$domain/user.js';

const testUser: User = {
    id: '507f1f77bcf86cd799439012',
    auth0Sub: 'auth0|test',
    email: 'test@example.com',
    name: 'Test User',
    timezone: 'Africa/Johannesburg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

const plantId = '507f1f77bcf86cd799439013';
const photoId = '507f1f77bcf86cd799439011';

const photo: Photo = {
    id: photoId,
    userId: testUser.id,
    plantId,
    uri: `${testUser.id}/${plantId}/${photoId}.webp`,
    takenAt: null,
    originalFilename: 'photo.jpg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

const plant: Plant = {
    id: plantId,
    userId: testUser.id,
    name: 'Cactus',
    description: null,
    coverPhotoId: null,
    acquiredAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

function buildMockService() {
    return {
        uploadToPlant: vi.fn<() => Promise<Photo>>(),
        delete: vi.fn<() => Promise<boolean>>(),
        setCoverPhoto: vi.fn(),
        getFile: vi.fn<() => Promise<Readable | null>>()
    } as unknown as PhotosService;
}

function buildMockPlantsRepo() {
    return {
        findAll: vi.fn(),
        findById: vi.fn<() => Promise<Plant | null>>(),
        create: vi.fn(),
        update: vi.fn(),
        clearCoverPhoto: vi.fn(),
        delete: vi.fn()
    } as unknown as PlantsRepository;
}

function buildMockPhotosRepo() {
    return {
        findAllByPlant: vi.fn<() => Promise<Photo[]>>(),
        findById: vi.fn(),
        findByIdPublic: vi.fn(),
        create: vi.fn(),
        delete: vi.fn()
    } as unknown as PhotosRepository;
}

/** Builds a minimal multipart/form-data body with an optional takenAt field before the file. */
function buildMultipartBody(boundary: string, filename: string, fileContent: Buffer, takenAt?: string) {
    const parts: Buffer[] = [];
    if (takenAt !== undefined) {
        parts.push(Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="takenAt"\r\n\r\n` +
            `${takenAt}\r\n`
        ));
    }
    parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: image/jpeg\r\n\r\n`
    ));
    parts.push(fileContent);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    return Buffer.concat(parts);
}

// --- 'plant' context ---

function buildPlantApp() {
    const app = Fastify({ logger: false });
    const mockPhotosService = buildMockService();
    const mockPlantsRepository = buildMockPlantsRepo();
    const mockPhotosRepository = buildMockPhotosRepo();
    app.register(multipart);
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('photosService', mockPhotosService as never);
    app.decorate('plantsRepository', mockPlantsRepository as never);
    app.decorate('photosRepository', mockPhotosRepository as never);
    app.register(photosRoutes, { prefix: `/plants/:plantId/photos`, context: 'plant' });
    return { app, mockPhotosService, mockPlantsRepository, mockPhotosRepository };
}

const PLANT_BASE = `/plants/${plantId}/photos`;

describe('GET /plants/:plantId/photos', () => {
    const { app, mockPlantsRepository, mockPhotosRepository } = buildPlantApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the plant gallery', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);
        vi.mocked(mockPhotosRepository.findAllByPlant).mockResolvedValue([photo]);

        const res = await app.inject({ method: 'GET', url: PLANT_BASE });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([photo]);
        expect(mockPhotosRepository.findAllByPlant).toHaveBeenCalledExactlyOnceWith(testUser.id, plantId);
    });

    it('returns 404 when the plant does not exist', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: PLANT_BASE });

        expect(res.statusCode).toBe(404);
        expect(mockPhotosRepository.findAllByPlant).not.toHaveBeenCalled();
    });

    it('returns 400 when plantId is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: '/plants/not-valid/photos' });

        expect(res.statusCode).toBe(400);
    });
});

describe('POST /plants/:plantId/photos', () => {
    const { app, mockPhotosService, mockPlantsRepository } = buildPlantApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    const boundary = 'testboundary';
    const fakeFile = Buffer.from([0xff, 0xd8, 0xff]); // minimal JPEG-ish bytes

    it('returns 201 with the created photo and a Location header', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);
        vi.mocked(mockPhotosService.uploadToPlant).mockResolvedValue(photo);

        const res = await app.inject({
            method: 'POST',
            url: PLANT_BASE,
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            payload: buildMultipartBody(boundary, 'photo.jpg', fakeFile)
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual(photo);
        expect(res.headers['location']).toBe(`/photos/${photo.id}`);
        expect(mockPhotosService.uploadToPlant).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ userId: testUser.id, plantId, filename: 'photo.jpg', takenAt: null })
        );
    });

    it('passes setAsCover to the service when query param is true', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);
        vi.mocked(mockPhotosService.uploadToPlant).mockResolvedValue(photo);

        await app.inject({
            method: 'POST',
            url: `${PLANT_BASE}?setAsCover=true`,
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            payload: buildMultipartBody(boundary, 'photo.jpg', fakeFile)
        });

        expect(mockPhotosService.uploadToPlant).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ setAsCover: true })
        );
    });

    it('passes takenAt from form fields', async () => {
        const takenAt = '2026-01-15T10:00:00.000Z';
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);
        vi.mocked(mockPhotosService.uploadToPlant).mockResolvedValue(photo);

        await app.inject({
            method: 'POST',
            url: PLANT_BASE,
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            payload: buildMultipartBody(boundary, 'photo.jpg', fakeFile, takenAt)
        });

        expect(mockPhotosService.uploadToPlant).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ takenAt })
        );
    });

    it('returns 404 when the plant does not exist', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(null);

        const res = await app.inject({
            method: 'POST',
            url: PLANT_BASE,
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            payload: buildMultipartBody(boundary, 'photo.jpg', fakeFile)
        });

        expect(res.statusCode).toBe(404);
        expect(mockPhotosService.uploadToPlant).not.toHaveBeenCalled();
    });

    it('returns 400 when no file is uploaded', async () => {
        vi.mocked(mockPlantsRepository.findById).mockResolvedValue(plant);

        const emptyBody = `--${boundary}--\r\n`;
        const res = await app.inject({
            method: 'POST',
            url: PLANT_BASE,
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            payload: emptyBody
        });

        expect(res.statusCode).toBe(400);
        expect(mockPhotosService.uploadToPlant).not.toHaveBeenCalled();
    });
});

// --- 'serve' context ---

function buildServeApp() {
    const app = Fastify({ logger: false });
    const mockPhotosService = buildMockService();
    app.decorate('photosService', mockPhotosService as never);
    app.register(photosRoutes, { prefix: '/photos', context: 'serve' });
    return { app, mockPhotosService };
}

describe('GET /photos/:photoId', () => {
    const { app, mockPhotosService } = buildServeApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the image stream', async () => {
        const stream = Readable.from(Buffer.from('webp-data'));
        vi.mocked(mockPhotosService.getFile).mockResolvedValue(stream);

        const res = await app.inject({ method: 'GET', url: `/photos/${photoId}` });

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('image/webp');
    });

    it('returns 404 when the photo does not exist', async () => {
        vi.mocked(mockPhotosService.getFile).mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: `/photos/${photoId}` });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when photoId is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: '/photos/not-valid' });

        expect(res.statusCode).toBe(400);
    });
});

// --- 'manage' context ---

function buildManageApp() {
    const app = Fastify({ logger: false });
    const mockPhotosService = buildMockService();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => { request.user = testUser; });
    app.decorate('photosService', mockPhotosService as never);
    app.register(photosRoutes, { prefix: '/photos', context: 'manage' });
    return { app, mockPhotosService };
}

describe('DELETE /photos/:photoId', () => {
    const { app, mockPhotosService } = buildManageApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 when the photo is deleted', async () => {
        vi.mocked(mockPhotosService.delete).mockResolvedValue(true);

        const res = await app.inject({ method: 'DELETE', url: `/photos/${photoId}` });

        expect(res.statusCode).toBe(204);
        expect(mockPhotosService.delete).toHaveBeenCalledExactlyOnceWith(testUser.id, photoId);
    });

    it('returns 404 when the photo is not found', async () => {
        vi.mocked(mockPhotosService.delete).mockResolvedValue(false);

        const res = await app.inject({ method: 'DELETE', url: `/photos/${photoId}` });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when photoId is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'DELETE', url: '/photos/not-valid' });

        expect(res.statusCode).toBe(400);
        expect(mockPhotosService.delete).not.toHaveBeenCalled();
    });
});
