import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

function errorHandler(fastify: FastifyInstance) {
    fastify.setErrorHandler((error, _request, reply) => {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
        ) {
            return reply
                .status(409)
                .send({ statusCode: 409, error: 'Conflict', message: 'Duplicate key' });
        }
        reply.send(error);
    });
}

export default fastifyPlugin(errorHandler);
