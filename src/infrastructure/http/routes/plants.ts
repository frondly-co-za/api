import { FastifyPluginCallback } from 'fastify';

const plantsRoute: FastifyPluginCallback = (fastify) => {
    fastify.get('/', async () => {
        return await fastify.plantService.getAll();
    });

    fastify.get('/:id', async (request) => {
        const { id } = request.params as { id: string };
        return await fastify.plantService.getById(id);
    });

    fastify.post('/', async (request) => {
        const { name } = request.body as { name: string };
        return await fastify.plantService.create(name);
    });
};

export default plantsRoute;
