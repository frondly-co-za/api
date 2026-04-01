import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoUsersRepository } from '$infrastructure/db/users-repository.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let repo: MongoUsersRepository;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    repo = new MongoUsersRepository(client.db('test'));
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

// Wipe the collection before each test for isolation
beforeEach(async () => {
    await client.db('test').collection('users').deleteMany({});
});

const defaultData = {
    auth0Sub: 'auth0|abc123',
    email: 'test@example.com',
    name: 'Test User',
    timezone: 'Africa/Johannesburg',
};

describe('findByAuth0Sub', () => {
    it('returns null when no user exists with that sub', async () => {
        expect(await repo.findByAuth0Sub('auth0|unknown')).toBeNull();
    });

    it('returns the user when they exist', async () => {
        const created = await repo.upsert(defaultData);
        const found = await repo.findByAuth0Sub(defaultData.auth0Sub);
        expect(found).toEqual(created);
    });
});

describe('upsert', () => {
    it('creates a new user and returns it with a generated id', async () => {
        const user = await repo.upsert(defaultData);

        expect(user.auth0Sub).toBe(defaultData.auth0Sub);
        expect(user.email).toBe(defaultData.email);
        expect(user.name).toBe(defaultData.name);
        expect(user.timezone).toBe(defaultData.timezone);
        expect(user.id).toBeTypeOf('string');
        expect(user.id).toHaveLength(24); // hex ObjectId
        expect(user.createdAt).toBeTypeOf('string');
        expect(user.updatedAt).toBeTypeOf('string');
    });

    it('updates fields on subsequent calls, preserving createdAt', async () => {
        const first = await repo.upsert(defaultData);
        const second = await repo.upsert({
            auth0Sub: defaultData.auth0Sub,
            email: 'updated@example.com',
            name: 'Updated Name',
            timezone: 'Europe/London',
        });

        expect(second.id).toBe(first.id);
        expect(second.email).toBe('updated@example.com');
        expect(second.name).toBe('Updated Name');
        expect(second.timezone).toBe('Europe/London');
        expect(second.createdAt).toBe(first.createdAt);
    });
});
