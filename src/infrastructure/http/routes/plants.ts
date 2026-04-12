import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { Plant, PlantSchema, CreatePlantDataSchema, UpdatePlantDataSchema } from '$domain/plant.js';
import { CareScheduleSchema } from '$domain/care-schedule.js';
import { CareLogSchema } from '$domain/care-log.js';
import { OID } from './oid.js';
import { signPhotoUrl } from '$infrastructure/http/signing/photo-url.js';
import careSchedulesRoutes from './care-schedules.js';
import careLogsRoutes from './care-logs.js';
import photosRoutes from './photos.js';

// coverPhotoId is set via the dedicated /cover endpoint, not in a general update
const UpdatePlantBody = Type.Object(Type.Omit(UpdatePlantDataSchema, ['coverPhotoId']).properties, {
    additionalProperties: false
});
type UpdatePlantBody = Static<typeof UpdatePlantBody>;

const { name, description, acquiredAt, notes } = CreatePlantDataSchema.properties;
const CreatePlantBody = Type.Object(
    {
        id: Type.Optional(Type.String(OID)),
        name,
        description: Type.Optional(description),
        acquiredAt: Type.Optional(acquiredAt),
        notes: Type.Optional(notes)
    },
    { additionalProperties: false }
);
type CreatePlantBody = Static<typeof CreatePlantBody>;

const PlantResponse = Type.Object({
    ...PlantSchema.properties,
    coverPhotoUrl: Type.Union([Type.String(), Type.Null()])
});
type PlantResponse = Static<typeof PlantResponse>;

const VALID_INCLUDES = ['schedules', 'recentLogs'] as const;
type IncludeKey = (typeof VALID_INCLUDES)[number];

const GetPlantsQuery = Type.Object(
    { include: Type.Optional(Type.String()) },
    { additionalProperties: false }
);
type GetPlantsQuery = Static<typeof GetPlantsQuery>;

const EnrichedPlantResponse = Type.Object({
    ...PlantSchema.properties,
    schedules: Type.Optional(Type.Array(CareScheduleSchema)),
    recentLogs: Type.Optional(Type.Array(CareLogSchema)),
    coverPhotoUrl: Type.Union([Type.String(), Type.Null()])
});
type EnrichedPlantResponse = Static<typeof EnrichedPlantResponse>;

function withCoverUrl(plant: Plant): PlantResponse {
    const secret = process.env.PHOTO_SIGNING_SECRET!;
    return {
        ...plant,
        coverPhotoUrl: plant.coverPhotoId ? signPhotoUrl(plant.coverPhotoId, secret) : null
    };
}

const SetCoverBody = Type.Object({ photoId: Type.String(OID) }, { additionalProperties: false });
type SetCoverBody = Static<typeof SetCoverBody>;

const PlantParams = Type.Object({ plantId: Type.String(OID) });
type PlantParams = Static<typeof PlantParams>;

const plantsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Querystring: GetPlantsQuery }>(
        '/',
        {
            schema: {
                querystring: GetPlantsQuery,
                response: { 200: Type.Array(EnrichedPlantResponse) }
            }
        },
        async (request, reply) => {
            const { include: includeParam } = request.query;
            let include: IncludeKey[] | undefined;

            if (includeParam !== undefined) {
                const parts = includeParam.split(',').map((s) => s.trim());
                const invalid = parts.filter(
                    (p) => !(VALID_INCLUDES as readonly string[]).includes(p)
                );
                if (invalid.length > 0) {
                    return reply.status(400).send({
                        statusCode: 400,
                        error: 'Bad Request',
                        message: `Unknown include value(s): ${invalid.join(', ')}`
                    });
                }
                include = parts as IncludeKey[];
            }

            const plants = await fastify.plantsRepository.findAll(request.user!.id, include);
            return plants.map(withCoverUrl);
        }
    );

    fastify.get<{ Params: PlantParams }>(
        '/:plantId',
        { schema: { params: PlantParams, response: { 200: PlantResponse } } },
        async (request, reply) => {
            const plant = await fastify.plantsRepository.findById(
                request.user!.id,
                request.params.plantId
            );
            if (!plant) return reply.status(404).send();
            return withCoverUrl(plant);
        }
    );

    fastify.post<{ Body: CreatePlantBody }>(
        '/',
        { schema: { body: CreatePlantBody, response: { 201: PlantResponse } } },
        async (request, reply) => {
            const { id, name, description, acquiredAt, notes } = request.body;
            const plant = await fastify.plantsRepository.create({
                id,
                userId: request.user!.id,
                name,
                description: description ?? null,
                acquiredAt: acquiredAt ?? null,
                notes: notes ?? null
            });
            return reply
                .status(201)
                .header('Location', `${request.url}/${plant.id}`)
                .send(withCoverUrl(plant));
        }
    );

    fastify.patch<{ Params: PlantParams; Body: UpdatePlantBody }>(
        '/:plantId',
        {
            schema: { params: PlantParams, body: UpdatePlantBody, response: { 200: PlantResponse } }
        },
        async (request, reply) => {
            const { name, description, acquiredAt, notes, updatedAt } = request.body;
            const plant = await fastify.plantsRepository.update(
                request.user!.id,
                request.params.plantId,
                { name, description, acquiredAt, notes, updatedAt }
            );
            if (!plant) {
                if (updatedAt !== undefined) {
                    const exists = await fastify.plantsRepository.findById(
                        request.user!.id,
                        request.params.plantId
                    );
                    if (exists) return reply.status(409).send();
                }
                return reply.status(404).send();
            }
            return withCoverUrl(plant);
        }
    );

    fastify.delete<{ Params: PlantParams }>(
        '/:plantId',
        { schema: { params: PlantParams } },
        async (request, reply) => {
            const deleted = await fastify.plantsRepository.delete(
                request.user!.id,
                request.params.plantId
            );
            if (!deleted) return reply.status(404).send();
            request.log.info({ plantId: request.params.plantId }, 'plant deleted');
            return reply.status(204).send();
        }
    );

    fastify.patch<{ Params: PlantParams; Body: SetCoverBody }>(
        '/:plantId/cover',
        { schema: { params: PlantParams, body: SetCoverBody, response: { 200: PlantResponse } } },
        async (request, reply) => {
            const plant = await fastify.photosService.setCoverPhoto(
                request.user!.id,
                request.params.plantId,
                request.body.photoId
            );
            if (!plant) return reply.status(404).send();
            return withCoverUrl(plant);
        }
    );

    fastify.register(careSchedulesRoutes, { prefix: '/:plantId/schedules' });
    fastify.register(careLogsRoutes, { prefix: '/:plantId/logs' });
    fastify.register(photosRoutes, {
        prefix: '/:plantId/photos',
        context: 'plant',
        servePrefix: '/photos'
    });
    done();
};

export default plantsRoutes;
