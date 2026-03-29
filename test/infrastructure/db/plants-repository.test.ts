import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoPlantsRepository } from '$infrastructure/db/plants-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoPlantsRepository;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoPlantsRepository(client.db('test'));
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

// Wipe the collection before each test for isolation
beforeEach(async () => {
    await client.db('test').collection('plants').deleteMany({});
});

describe('findAll', () => {
    it('returns an empty array when there are no plants', async () => {
        expect(await repo.findAll()).toEqual([]);
    });

    it('returns all plants', async () => {
        await repo.create('Cactus');
        await repo.create('Fern');

        const plants = await repo.findAll();

        expect(plants).toHaveLength(2);
        expect(plants.map((p) => p.name)).toEqual(expect.arrayContaining(['Cactus', 'Fern']));
    });
});

describe('findById', () => {
    it('returns null when no plant has that id', async () => {
        const { ObjectId } = await import('mongodb');
        const id = new ObjectId().toHexString();

        expect(await repo.findById(id)).toBeNull();
    });

    it('returns the plant when it exists', async () => {
        const created = await repo.create('Cactus');

        expect(await repo.findById(created.id)).toEqual(created);
    });

    it('throws when given a string that is not a valid ObjectId', async () => {
        await expect(repo.findById('not-a-valid-id')).rejects.toThrow();
    });
});

describe('create', () => {
    it('persists the plant and returns it with a generated id', async () => {
        const plant = await repo.create('Cactus');

        expect(plant.name).toBe('Cactus');
        expect(plant.id).toBeTypeOf('string');
        expect(plant.id).toHaveLength(24); // hex ObjectId

        // Verify it was actually persisted
        expect(await repo.findById(plant.id)).toEqual(plant);
    });
});
