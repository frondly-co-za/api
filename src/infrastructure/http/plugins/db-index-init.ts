import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

async function dbIndexInit(fastify: FastifyInstance) {
    const db = fastify.mongo.db!;

    await Promise.all([
        db.collection('plants').createIndex({ userId: 1 }),

        db.collection('photos').createIndex({ userId: 1, plantId: 1, createdAt: -1 }),

        db.collection('care-schedules').createIndex({ userId: 1, plantId: 1 }),
        db.collection('care-schedules').createIndex({ userId: 1, isActive: 1, nextDue: 1 }),

        db.collection('care-logs').createIndex({ userId: 1, plantId: 1 }),

        db.collection('care-types').createIndex({ userId: 1 }),

        db.collection('users').createIndex({ auth0Sub: 1 }, { unique: true })
    ]);

    fastify.log.info('MongoDB indexes ensured');
}

export default fastifyPlugin(dbIndexInit);
