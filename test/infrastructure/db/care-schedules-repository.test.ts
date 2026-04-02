import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoCareSchedulesRepository } from '$infrastructure/db/care-schedules-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoCareSchedulesRepository;
let userId: string;
let plantId: string;
let careTypeId: string;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoCareSchedulesRepository(client.db('test'));
    userId = new ObjectId().toHexString();
    plantId = new ObjectId().toHexString();
    careTypeId = new ObjectId().toHexString();
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

beforeEach(async () => {
    await client.db('test').collection('care-schedules').deleteMany({});
});

const createSchedule = (overrides: { userId?: string; plantId?: string; nextDue?: string } = {}) =>
    repo.create({
        userId: overrides.userId ?? userId,
        plantId: overrides.plantId ?? plantId,
        careTypeId,
        selectedOption: null,
        notes: null,
        dayOfWeek: [1, 3],
        dayOfMonth: [],
        months: [],
        nextDue: overrides.nextDue ?? '2026-04-07T00:00:00.000Z',
    });

describe('create', () => {
    it('persists the schedule and returns it with a generated id', async () => {
        const schedule = await createSchedule();

        expect(schedule.userId).toBe(userId);
        expect(schedule.plantId).toBe(plantId);
        expect(schedule.careTypeId).toBe(careTypeId);
        expect(schedule.dayOfWeek).toEqual([1, 3]);
        expect(schedule.isActive).toBe(true);
        expect(schedule.id).toBeTypeOf('string');
        expect(schedule.id).toHaveLength(24);
        expect(schedule.nextDue).toBe('2026-04-07T00:00:00.000Z');
        expect(schedule.createdAt).toBeTypeOf('string');
        expect(schedule.updatedAt).toBeTypeOf('string');
    });
});

describe('update', () => {
    it("updates the schedule's fields and returns it", async () => {
        const created = await createSchedule();

        const updated = await repo.update(userId, plantId, created.id, { notes: 'weekly', dayOfWeek: [5] });

        expect(updated).not.toBeNull();
        expect(updated!.notes).toBe('weekly');
        expect(updated!.dayOfWeek).toEqual([5]);
        expect(updated!.id).toBe(created.id);
    });

    it('updates nextDue and isActive', async () => {
        const created = await createSchedule();

        const updated = await repo.update(userId, plantId, created.id, {
            nextDue: '2026-05-01T00:00:00.000Z',
            isActive: false,
        });

        expect(updated!.nextDue).toBe('2026-05-01T00:00:00.000Z');
        expect(updated!.isActive).toBe(false);
    });

    it('returns null for an unknown id', async () => {
        expect(await repo.update(userId, plantId, new ObjectId().toHexString(), { notes: 'x' })).toBeNull();
    });

    it("returns null when trying to update another user's schedule", async () => {
        const created = await createSchedule();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.update(otherUserId, plantId, created.id, { notes: 'x' })).toBeNull();
    });

    it('returns null when plantId does not match', async () => {
        const created = await createSchedule();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.update(userId, otherPlantId, created.id, { notes: 'x' })).toBeNull();
    });
});

describe('findByPlantId', () => {
    it('returns an empty array when there are no schedules', async () => {
        expect(await repo.findByPlantId(userId, plantId)).toEqual([]);
    });

    it('returns schedules for the given user and plant', async () => {
        const created = await createSchedule();

        const schedules = await repo.findByPlantId(userId, plantId);

        expect(schedules).toHaveLength(1);
        expect(schedules[0].id).toBe(created.id);
    });

    it("does not return another user's schedules", async () => {
        await createSchedule();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findByPlantId(otherUserId, plantId)).toEqual([]);
    });

    it('does not return schedules for a different plant', async () => {
        await createSchedule();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.findByPlantId(userId, otherPlantId)).toEqual([]);
    });
});

describe('findDue', () => {
    it('returns active schedules whose nextDue is at or before the given time', async () => {
        await createSchedule({ nextDue: '2026-04-01T00:00:00.000Z' });

        const due = await repo.findDue(userId, '2026-04-07T00:00:00.000Z');

        expect(due).toHaveLength(1);
    });

    it('does not return schedules whose nextDue is in the future', async () => {
        await createSchedule({ nextDue: '2026-04-10T00:00:00.000Z' });

        expect(await repo.findDue(userId, '2026-04-07T00:00:00.000Z')).toEqual([]);
    });

    it('does not return inactive schedules', async () => {
        const created = await createSchedule({ nextDue: '2026-04-01T00:00:00.000Z' });
        await repo.update(userId, plantId, created.id, { isActive: false });

        expect(await repo.findDue(userId, '2026-04-07T00:00:00.000Z')).toEqual([]);
    });

    it("does not return another user's due schedules", async () => {
        await createSchedule({ nextDue: '2026-04-01T00:00:00.000Z' });
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findDue(otherUserId, '2026-04-07T00:00:00.000Z')).toEqual([]);
    });
});

describe('findById', () => {
    it('returns null for an unknown id', async () => {
        expect(await repo.findById(userId, plantId, new ObjectId().toHexString())).toBeNull();
    });

    it('returns the schedule when it exists', async () => {
        const created = await createSchedule();

        expect(await repo.findById(userId, plantId, created.id)).toEqual(created);
    });

    it("returns null for another user's schedule", async () => {
        const created = await createSchedule();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.findById(otherUserId, plantId, created.id)).toBeNull();
    });

    it('returns null when plantId does not match', async () => {
        const created = await createSchedule();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.findById(userId, otherPlantId, created.id)).toBeNull();
    });
});

describe('delete', () => {
    it('deletes the schedule and returns true', async () => {
        const created = await createSchedule();

        expect(await repo.delete(userId, plantId, created.id)).toBe(true);
        expect(await repo.findById(userId, plantId, created.id)).toBeNull();
    });

    it('returns false for an unknown id', async () => {
        expect(await repo.delete(userId, plantId, new ObjectId().toHexString())).toBe(false);
    });

    it("returns false when trying to delete another user's schedule", async () => {
        const created = await createSchedule();
        const otherUserId = new ObjectId().toHexString();

        expect(await repo.delete(otherUserId, plantId, created.id)).toBe(false);
    });

    it('returns false when plantId does not match', async () => {
        const created = await createSchedule();
        const otherPlantId = new ObjectId().toHexString();

        expect(await repo.delete(userId, otherPlantId, created.id)).toBe(false);
        expect(await repo.findById(userId, plantId, created.id)).not.toBeNull();
    });
});
