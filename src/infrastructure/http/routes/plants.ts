import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { PlantSchema } from '$domain/plant.js';

const CreatePlantBody = Type.Pick(PlantSchema, ['name']);
type CreatePlantBody = Static<typeof CreatePlantBody>;

const PlantParams = Type.Object({ id: Type.String({ pattern: '^[0-9a-f]{24}$' }) });
type PlantParams = Static<typeof PlantParams>;

const plantsRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get('/', { schema: { response: { 200: Type.Array(PlantSchema) } } }, async () => {
        return fastify.plantsService.getAll();
    });

    fastify.get<{ Params: PlantParams }>(
        '/:id',
        { schema: { params: PlantParams, response: { 200: PlantSchema } } },
        async (request, reply) => {
            const { id } = request.params;
            const plant = await fastify.plantsService.getById(id);
            if (!plant) return reply.status(404).send();
            return plant;
        }
    );

    fastify.post<{ Body: CreatePlantBody }>(
        '/',
        { schema: { body: CreatePlantBody, response: { 201: PlantSchema } } },
        async (request, reply) => {
            const plant = await fastify.plantsService.create(request.body.name);
            return reply.status(201).header('Location', `${request.url}/${plant.id}`).send(plant);
        }
    );

    done();
};

export default plantsRoute;
