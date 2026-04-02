import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoPhotosRepository } from '$infrastructure/db/photos-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoPhotosRepository;
let userId: string;
let plantId: string;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoPhotosRepository(client.db('test'));
    userId = new ObjectId().toHexString();
    plantId = new ObjectId().toHexString();
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

beforeEach(async () => {
    await client.db('test').collection('photos').deleteMany({});
});

const createPhoto = (overrides: { plantId?: string } = {}) =>
    repo.create({
        id: new ObjectId().toHexString(),
        userId,
        plantId: overrides.plantId ?? plantId,
        uri: `${userId}/${plantId}/photo.webp`,
        takenAt: null,
        originalFilename: null
    });

describe('create', () => {
    it('persists the photo and returns it with the provided id', async () => {
        const photo = await createPhoto();

        expect(photo.userId).toBe(userId);
        expect(photo.plantId).toBe(plantId);
        expect(photo.id).toHaveLength(24);
        expect(photo.takenAt).toBeNull();
        expect(photo.originalFilename).toBeNull();
        expect(photo.createdAt).toBeTypeOf('string');
        expect(photo.updatedAt).toBeTypeOf('string');

        expect(await repo.findById(userId, photo.id)).toEqual(photo);
    });

    it('stores takenAt and originalFilename when provided', async () => {
        const takenAt = '2026-01-15T10:00:00.000Z';
        const photo = await repo.create({
            id: new ObjectId().toHexString(),
            userId,
            plantId,
            uri: `${userId}/${plantId}/photo.webp`,
            takenAt,
            originalFilename: 'IMG_001.jpg'
        });

        expect(photo.takenAt).toBe(takenAt);
        expect(photo.originalFilename).toBe('IMG_001.jpg');
    });
});

describe('findById', () => {
    it('returns null when no photo has that id', async () => {
        expect(await repo.findById(userId, new ObjectId().toHexString())).toBeNull();
    });

    it('returns the photo when it exists', async () => {
        const created = await createPhoto();

        expect(await repo.findById(userId, created.id)).toEqual(created);
    });

    it('returns null when the photo belongs to a different user', async () => {
        const created = await createPhoto();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findById(otherUserId, created.id)).toBeNull();
    });
});

describe('findByIdPublic', () => {
    it('returns the photo regardless of userId', async () => {
        const created = await createPhoto();

        expect(await repo.findByIdPublic(created.id)).toEqual(created);
    });

    it('returns null when no photo has that id', async () => {
        expect(await repo.findByIdPublic(new ObjectId().toHexString())).toBeNull();
    });
});

describe('findAllByPlant', () => {
    it('returns an empty array when there are no photos', async () => {
        expect(await repo.findAllByPlant(userId, plantId)).toEqual([]);
    });

    it('returns all photos for the given plant in descending createdAt order', async () => {
        const first = await createPhoto();
        await new Promise((r) => setTimeout(r, 10));
        const second = await createPhoto();

        const photos = await repo.findAllByPlant(userId, plantId);

        expect(photos).toHaveLength(2);
        expect(photos[0].id).toBe(second.id);
        expect(photos[1].id).toBe(first.id);
    });

    it('does not return photos belonging to a different user', async () => {
        await createPhoto();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findAllByPlant(otherUserId, plantId)).toEqual([]);
    });

    it('does not return photos belonging to a different plant', async () => {
        const otherPlantId = new ObjectId().toHexString();
        await createPhoto({ plantId: otherPlantId });

        expect(await repo.findAllByPlant(userId, plantId)).toEqual([]);
    });
});

describe('delete', () => {
    it('returns false when no photo has that id', async () => {
        expect(await repo.delete(userId, new ObjectId().toHexString())).toBe(false);
    });

    it('returns false when the photo belongs to a different user', async () => {
        const photo = await createPhoto();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.delete(otherUserId, photo.id)).toBe(false);
        expect(await repo.findById(userId, photo.id)).not.toBeNull();
    });

    it('deletes the photo and returns true', async () => {
        const photo = await createPhoto();

        expect(await repo.delete(userId, photo.id)).toBe(true);
        expect(await repo.findById(userId, photo.id)).toBeNull();
    });
});
