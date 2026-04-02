import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dbIndexInit from '$infrastructure/http/plugins/db-index-init.js';

let mongod: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
});

afterAll(async () => {
    await client.close();
    await mongod.stop();
});

describe('dbIndexInit plugin', () => {
    it('creates the users.auth0Sub unique index', async () => {
        const db = client.db('test-index-init');
        const app = Fastify({ logger: false });
        app.decorate('mongo', { db } as never);
        app.register(dbIndexInit);
        await app.ready();

        const indexes = await db.collection('users').indexes();
        const auth0SubIndex = indexes.find((idx) => idx.key?.auth0Sub === 1);

        expect(auth0SubIndex).toBeDefined();
        expect(auth0SubIndex?.unique).toBe(true);

        await app.close();
    });

    it('creates the plants.userId index', async () => {
        const db = client.db('test-index-init-2');
        const app = Fastify({ logger: false });
        app.decorate('mongo', { db } as never);
        app.register(dbIndexInit);
        await app.ready();

        const indexes = await db.collection('plants').indexes();
        const userIdIndex = indexes.find((idx) => idx.key?.userId === 1);

        expect(userIdIndex).toBeDefined();

        await app.close();
    });

    it('is idempotent — calling it twice does not throw', async () => {
        const db = client.db('test-index-init-3');
        const app1 = Fastify({ logger: false });
        app1.decorate('mongo', { db } as never);
        app1.register(dbIndexInit);
        await app1.ready();
        await app1.close();

        const app2 = Fastify({ logger: false });
        app2.decorate('mongo', { db } as never);
        app2.register(dbIndexInit);
        await expect(app2.ready()).resolves.not.toThrow();
        await app2.close();
    });
});
