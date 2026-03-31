import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoCareTypesRepository } from '$infrastructure/db/care-types-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoCareTypesRepository;
let userId: string;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoCareTypesRepository(client.db('test'));
    userId = new ObjectId().toHexString();
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

beforeEach(async () => {
    await client.db('test').collection('care-types').deleteMany({});
});

const createUserType = (name: string) =>
    repo.create({ userId, name, options: [] });

/** Insert a system type (userId: null) directly into the collection */
const insertSystemType = async (name: string) => {
    const now = new Date();
    const _id = new ObjectId();
    await client.db('test').collection('care-types').insertOne({
        _id,
        userId: null,
        name,
        options: [],
        createdAt: now,
        updatedAt: now,
    });
    return _id.toHexString();
};

describe('create', () => {
    it('persists the type and returns it with a generated id', async () => {
        const type = await repo.create({ userId, name: 'Watering', options: ['light', 'deep'] });

        expect(type.name).toBe('Watering');
        expect(type.userId).toBe(userId);
        expect(type.options).toEqual(['light', 'deep']);
        expect(type.id).toBeTypeOf('string');
        expect(type.id).toHaveLength(24);
        expect(type.createdAt).toBeTypeOf('string');
        expect(type.updatedAt).toBeTypeOf('string');

        expect(await repo.findById(userId, type.id)).toEqual(type);
    });
});

describe('findAll', () => {
    it('returns an empty array when there are no types', async () => {
        expect(await repo.findAll(userId)).toEqual([]);
    });

    it("returns the user's own types", async () => {
        await createUserType('Watering');

        const types = await repo.findAll(userId);

        expect(types).toHaveLength(1);
        expect(types[0].name).toBe('Watering');
        expect(types[0].userId).toBe(userId);
    });

    it('includes system types (userId null) in the results', async () => {
        await insertSystemType('Fertilising');
        await createUserType('Watering');

        const types = await repo.findAll(userId);

        expect(types).toHaveLength(2);
        expect(types.map((t) => t.name)).toEqual(expect.arrayContaining(['Fertilising', 'Watering']));
    });

    it("does not return another user's types", async () => {
        await createUserType('Watering');
        const otherUserId = new ObjectId().toHexString();

        const types = await repo.findAll(otherUserId);

        expect(types).toHaveLength(0);
    });
});

describe('findById', () => {
    it('returns null for an unknown id', async () => {
        expect(await repo.findById(userId, new ObjectId().toHexString())).toBeNull();
    });

    it("returns the user's own type", async () => {
        const created = await createUserType('Watering');

        expect(await repo.findById(userId, created.id)).toEqual(created);
    });

    it('returns a system type to any user', async () => {
        const systemId = await insertSystemType('Fertilising');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findById(userId, systemId)).not.toBeNull();
        expect(await repo.findById(otherUserId, systemId)).not.toBeNull();
    });

    it("returns null for another user's type", async () => {
        const created = await createUserType('Watering');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findById(otherUserId, created.id)).toBeNull();
    });

    it('throws when given a string that is not a valid ObjectId', async () => {
        await expect(repo.findById(userId, 'not-a-valid-id')).rejects.toThrow();
    });
});

describe('update', () => {
    it("updates the user's own type and returns it", async () => {
        const created = await createUserType('Watering');

        const updated = await repo.update(userId, created.id, { name: 'Deep Watering' });

        expect(updated).not.toBeNull();
        expect(updated!.name).toBe('Deep Watering');
        expect(updated!.id).toBe(created.id);
    });

    it('returns null for an unknown id', async () => {
        expect(await repo.update(userId, new ObjectId().toHexString(), { name: 'x' })).toBeNull();
    });

    it("returns null when trying to update another user's type", async () => {
        const created = await createUserType('Watering');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.update(otherUserId, created.id, { name: 'x' })).toBeNull();
    });

    it('returns null when trying to update a system type', async () => {
        const systemId = await insertSystemType('Fertilising');

        expect(await repo.update(userId, systemId, { name: 'x' })).toBeNull();
    });
});

describe('delete', () => {
    it("deletes the user's own type and returns true", async () => {
        const created = await createUserType('Watering');

        expect(await repo.delete(userId, created.id)).toBe(true);
        expect(await repo.findById(userId, created.id)).toBeNull();
    });

    it('returns false for an unknown id', async () => {
        expect(await repo.delete(userId, new ObjectId().toHexString())).toBe(false);
    });

    it("returns false when trying to delete another user's type", async () => {
        const created = await createUserType('Watering');
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.delete(otherUserId, created.id)).toBe(false);
    });

    it('returns false when trying to delete a system type', async () => {
        const systemId = await insertSystemType('Fertilising');

        expect(await repo.delete(userId, systemId)).toBe(false);
    });
});
