import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { PlantSchema } from '$domain/plant.js';

const CreatePlantBody = Type.Object({
    userId: Type.String({ pattern: '^[0-9a-f]{24}$' }),
    name: Type.String(),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    acquiredAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
type CreatePlantBody = Static<typeof CreatePlantBody>;

const PlantParams = Type.Object({ id: Type.String({ pattern: '^[0-9a-f]{24}$' }) });
type PlantParams = Static<typeof PlantParams>;

const PlantsQuery = Type.Object({ userId: Type.String({ pattern: '^[0-9a-f]{24}$' }) });
type PlantsQuery = Static<typeof PlantsQuery>;

const plantsRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Querystring: PlantsQuery }>(
        '/',
        { schema: { querystring: PlantsQuery, response: { 200: Type.Array(PlantSchema) } } },
        async (request) => {
            return fastify.plantsService.getAll(request.query.userId);
        }
    );

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
            const { userId, name, description, photoUrl, acquiredAt, notes } = request.body;
            const plant = await fastify.plantsService.create({
                userId,
                name,
                description: description ?? null,
                photoUrl: photoUrl ?? null,
                acquiredAt: acquiredAt ?? null,
                notes: notes ?? null
            });
            return reply.status(201).header('Location', `${request.url}/${plant.id}`).send(plant);
        }
    );

    done();
};

export default plantsRoute;
