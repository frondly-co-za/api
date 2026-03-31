import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoPlantsRepository } from '$infrastructure/db/plants-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoPlantsRepository;
let userId: string;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoPlantsRepository(client.db('test'));
    userId = new ObjectId().toHexString();
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

// Wipe the collection before each test for isolation
beforeEach(async () => {
    await client.db('test').collection('plants').deleteMany({});
});

const createPlant = (name: string) =>
    repo.create({ userId, name, description: null, acquiredAt: null, notes: null });

describe('create', () => {
    it('persists the plant and returns it with a generated id', async () => {
        const plant = await createPlant('Cactus');

        expect(plant.name).toBe('Cactus');
        expect(plant.userId).toBe(userId);
        expect(plant.id).toBeTypeOf('string');
        expect(plant.id).toHaveLength(24); // hex ObjectId
        expect(plant.description).toBeNull();
        expect(plant.createdAt).toBeTypeOf('string');
        expect(plant.updatedAt).toBeTypeOf('string');

        // Verify it was actually persisted
        expect(await repo.findById(userId, plant.id)).toEqual(plant);
    });

    it('stores acquiredAt when provided', async () => {
        const acquiredAt = '2025-06-15T00:00:00.000Z';
        const plant = await repo.create({
            userId,
            name: 'Monstera',
            description: 'Monstera Deliciosa',
            acquiredAt,
            notes: 'Bought at the market',
        });

        expect(plant.acquiredAt).toBe(acquiredAt);
        expect(plant.description).toBe('Monstera Deliciosa');
        expect(plant.notes).toBe('Bought at the market');
    });
});

describe('findAll', () => {
    it('returns an empty array when there are no plants', async () => {
        expect(await repo.findAll(userId)).toEqual([]);
    });

    it('returns all plants for the given userId', async () => {
        await createPlant('Cactus');
        await createPlant('Fern');

        const plants = await repo.findAll(userId);

        expect(plants).toHaveLength(2);
        expect(plants.map((p) => p.name)).toEqual(expect.arrayContaining(['Cactus', 'Fern']));
    });

    it('does not return plants belonging to a different user', async () => {
        await createPlant('Cactus');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findAll(otherUserId)).toEqual([]);
    });
});

describe('findById', () => {
    it('returns null when no plant has that id', async () => {
        expect(await repo.findById(userId, new ObjectId().toHexString())).toBeNull();
    });

    it('returns the plant when it exists', async () => {
        const created = await createPlant('Cactus');

        expect(await repo.findById(userId, created.id)).toEqual(created);
    });

    it('returns null when the plant belongs to a different user', async () => {
        const created = await createPlant('Cactus');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findById(otherUserId, created.id)).toBeNull();
    });

    it('throws when given a string that is not a valid ObjectId', async () => {
        await expect(repo.findById(userId, 'not-a-valid-id')).rejects.toThrow();
    });
});

describe('update', () => {
    it('returns null when no plant has that id', async () => {
        expect(await repo.update(userId, new ObjectId().toHexString(), { name: 'X' })).toBeNull();
    });

    it('returns null when the plant belongs to a different user', async () => {
        const plant = await createPlant('Cactus');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.update(otherUserId, plant.id, { name: 'X' })).toBeNull();
    });

    it('updates only the provided fields and bumps updatedAt', async () => {
        const plant = await createPlant('Cactus');

        const updated = await repo.update(userId, plant.id, { name: 'Updated Cactus' });

        expect(updated).not.toBeNull();
        expect(updated!.name).toBe('Updated Cactus');
        expect(updated!.description).toBeNull();
        expect(updated!.updatedAt >= plant.updatedAt).toBe(true);
    });

    it('converts acquiredAt string to Date and back', async () => {
        const plant = await createPlant('Cactus');
        const acquiredAt = '2025-06-15T00:00:00.000Z';

        const updated = await repo.update(userId, plant.id, { acquiredAt });

        expect(updated!.acquiredAt).toBe(acquiredAt);
    });

    it('sets acquiredAt to null when explicitly passed null', async () => {
        const plant = await repo.create({
            userId,
            name: 'Cactus',
            description: null,
            acquiredAt: '2025-06-15T00:00:00.000Z',
            notes: null,
        });

        const updated = await repo.update(userId, plant.id, { acquiredAt: null });

        expect(updated!.acquiredAt).toBeNull();
    });
});

describe('delete', () => {
    it('returns false when no plant has that id', async () => {
        expect(await repo.delete(userId, new ObjectId().toHexString())).toBe(false);
    });

    it('returns false when the plant belongs to a different user', async () => {
        const plant = await createPlant('Cactus');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.delete(otherUserId, plant.id)).toBe(false);
        expect(await repo.findById(userId, plant.id)).not.toBeNull();
    });

    it('deletes the plant and returns true', async () => {
        const plant = await createPlant('Cactus');

        expect(await repo.delete(userId, plant.id)).toBe(true);
        expect(await repo.findById(userId, plant.id)).toBeNull();
    });
});

describe('clearCoverPhoto', () => {
    it('nulls coverPhotoId when it matches the given photoId', async () => {
        const photoId = new ObjectId().toHexString();
        const plant = await createPlant('Cactus');
        await repo.update(userId, plant.id, { coverPhotoId: photoId });

        await repo.clearCoverPhoto(userId, plant.id, photoId);

        expect((await repo.findById(userId, plant.id))!.coverPhotoId).toBeNull();
    });

    it('does not change coverPhotoId when it does not match', async () => {
        const photoId = new ObjectId().toHexString();
        const otherPhotoId = new ObjectId().toHexString();
        const plant = await createPlant('Cactus');
        await repo.update(userId, plant.id, { coverPhotoId: photoId });

        await repo.clearCoverPhoto(userId, plant.id, otherPhotoId);

        expect((await repo.findById(userId, plant.id))!.coverPhotoId).toBe(photoId);
    });
});
