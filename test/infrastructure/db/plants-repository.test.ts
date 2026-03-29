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
    repo.create({ userId, name, description: null, photoUrl: null, acquiredAt: null, notes: null });

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
        expect(await repo.findById(new ObjectId().toHexString())).toBeNull();
    });

    it('returns the plant when it exists', async () => {
        const created = await createPlant('Cactus');

        expect(await repo.findById(created.id)).toEqual(created);
    });

    it('throws when given a string that is not a valid ObjectId', async () => {
        await expect(repo.findById('not-a-valid-id')).rejects.toThrow();
    });
});

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
        expect(await repo.findById(plant.id)).toEqual(plant);
    });

    it('stores acquiredAt when provided', async () => {
        const acquiredAt = '2025-06-15T00:00:00.000Z';
        const plant = await repo.create({
            userId,
            name: 'Monstera',
            description: 'Monstera Deliciosa',
            photoUrl: null,
            acquiredAt,
            notes: 'Bought at the market',
        });

        expect(plant.acquiredAt).toBe(acquiredAt);
        expect(plant.description).toBe('Monstera Deliciosa');
        expect(plant.notes).toBe('Bought at the market');
    });
});
