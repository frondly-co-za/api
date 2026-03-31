import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoCareLogsRepository } from '$infrastructure/db/care-logs-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoCareLogsRepository;
let userId: string;
let plantId: string;
let careTypeId: string;
let scheduleId: string;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoCareLogsRepository(client.db('test'));
    userId = new ObjectId().toHexString();
    plantId = new ObjectId().toHexString();
    careTypeId = new ObjectId().toHexString();
    scheduleId = new ObjectId().toHexString();
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

beforeEach(async () => {
    await client.db('test').collection('care-logs').deleteMany({});
});

const createLog = (overrides: { userId?: string; plantId?: string; scheduleId?: string | null } = {}) =>
    repo.create({
        userId: overrides.userId ?? userId,
        plantId: overrides.plantId ?? plantId,
        scheduleId: overrides.scheduleId !== undefined ? overrides.scheduleId : null,
        careTypeId,
        selectedOption: null,
        notes: null,
        performedAt: '2026-03-31T10:00:00.000Z',
    });

describe('create', () => {
    it('persists an ad-hoc log (scheduleId: null) and returns it', async () => {
        const log = await createLog();

        expect(log.userId).toBe(userId);
        expect(log.plantId).toBe(plantId);
        expect(log.scheduleId).toBeNull();
        expect(log.careTypeId).toBe(careTypeId);
        expect(log.id).toBeTypeOf('string');
        expect(log.id).toHaveLength(24);
        expect(log.performedAt).toBe('2026-03-31T10:00:00.000Z');
        expect(log.createdAt).toBeTypeOf('string');
    });

    it('persists a scheduled log with a scheduleId', async () => {
        const log = await createLog({ scheduleId });

        expect(log.scheduleId).toBe(scheduleId);
    });
});

describe('findByPlantId', () => {
    it('returns an empty array when there are no logs', async () => {
        expect(await repo.findByPlantId(userId, plantId)).toEqual([]);
    });

    it('returns all logs for the given user and plant', async () => {
        await createLog();
        await createLog({ scheduleId });

        const logs = await repo.findByPlantId(userId, plantId);

        expect(logs).toHaveLength(2);
    });

    it("does not return another user's logs", async () => {
        await createLog();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findByPlantId(otherUserId, plantId)).toEqual([]);
    });

    it('does not return logs for a different plant', async () => {
        await createLog();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.findByPlantId(userId, otherPlantId)).toEqual([]);
    });
});

describe('findById', () => {
    it('returns null for an unknown id', async () => {
        expect(await repo.findById(userId, plantId, new ObjectId().toHexString())).toBeNull();
    });

    it('returns the log when it exists', async () => {
        const created = await createLog();

        expect(await repo.findById(userId, plantId, created.id)).toEqual(created);
    });

    it("returns null for another user's log", async () => {
        const created = await createLog();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findById(otherUserId, plantId, created.id)).toBeNull();
    });

    it('returns null when plantId does not match', async () => {
        const created = await createLog();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.findById(userId, otherPlantId, created.id)).toBeNull();
    });
});

describe('delete', () => {
    it('deletes the log and returns true', async () => {
        const created = await createLog();

        expect(await repo.delete(userId, plantId, created.id)).toBe(true);
        expect(await repo.findById(userId, plantId, created.id)).toBeNull();
    });

    it('returns false for an unknown id', async () => {
        expect(await repo.delete(userId, plantId, new ObjectId().toHexString())).toBe(false);
    });

    it("returns false when trying to delete another user's log", async () => {
        const created = await createLog();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.delete(otherUserId, plantId, created.id)).toBe(false);
    });

    it('returns false when plantId does not match', async () => {
        const created = await createLog();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.delete(userId, otherPlantId, created.id)).toBe(false);
    });
});
