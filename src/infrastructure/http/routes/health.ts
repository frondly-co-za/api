import { FastifyPluginCallback } from 'fastify';

const healthRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get('/', async (_request, reply) => {
        try {
            await fastify.mongo.db?.admin().ping();
            return reply.send({ status: 'ok' });
        } catch {
            return reply.status(503).send({ status: 'unavailable' });
        }
    });

    done();
};

export default healthRoutes;
