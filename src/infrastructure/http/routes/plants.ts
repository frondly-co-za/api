import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { PlantSchema } from '$domain/plant.js';
import { OID } from './oid.js';
import careSchedulesRoutes from './care-schedules.js';
import careLogsRoutes from './care-logs.js';

const CreatePlantBody = Type.Object({
    name: Type.String(),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    acquiredAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
type CreatePlantBody = Static<typeof CreatePlantBody>;

const PlantParams = Type.Object({ plantId: Type.String(OID) });
type PlantParams = Static<typeof PlantParams>;

const plantsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get(
        '/',
        { schema: { response: { 200: Type.Array(PlantSchema) } } },
        async (request) => {
            return fastify.plantsRepository.findAll(request.user!.id);
        }
    );

    fastify.get<{ Params: PlantParams }>(
        '/:plantId',
        { schema: { params: PlantParams, response: { 200: PlantSchema } } },
        async (request, reply) => {
            const plant = await fastify.plantsRepository.findById(request.params.plantId);
            if (!plant) return reply.status(404).send();
            return plant;
        }
    );

    fastify.post<{ Body: CreatePlantBody }>(
        '/',
        { schema: { body: CreatePlantBody, response: { 201: PlantSchema } } },
        async (request, reply) => {
            const { name, description, photoUrl, acquiredAt, notes } = request.body;
            const plant = await fastify.plantsRepository.create({
                userId: request.user!.id,
                name,
                description: description ?? null,
                photoUrl: photoUrl ?? null,
                acquiredAt: acquiredAt ?? null,
                notes: notes ?? null
            });
            return reply.status(201).header('Location', `${request.url}/${plant.id}`).send(plant);
        }
    );

    fastify.register(careSchedulesRoutes, { prefix: '/:plantId/schedules' });
    fastify.register(careLogsRoutes, { prefix: '/:plantId/logs', scheduleContext: false });
    done();
};

export default plantsRoutes;
