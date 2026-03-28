import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { PlantSchema } from '$domain/plant.js';

const CreatePlantBody = Type.Pick(PlantSchema, ['name']);
type CreatePlantBody = Static<typeof CreatePlantBody>;

const plantsRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get('/', { schema: { response: { 200: Type.Array(PlantSchema) } } }, async () => {
        return fastify.plantsService.getAll();
    });

    fastify.get('/:id', { schema: { response: { 200: PlantSchema } } }, async (request) => {
        const { id } = request.params as { id: string };
        return fastify.plantsService.getById(id);
    });

    fastify.post<{ Body: CreatePlantBody }>(
        '/',
        { schema: { body: CreatePlantBody, response: { 201: PlantSchema } } },
        async (request, reply) => {
            const plant = await fastify.plantsService.create(request.body.name);
            return reply.status(201).send(plant);
        }
    );

    done();
};

export default plantsRoute;
