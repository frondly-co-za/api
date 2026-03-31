import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import {
    CareScheduleSchema,
    CreateCareScheduleDataSchema,
    UpdateCareScheduleDataSchema
} from '$domain/care-schedule.js';
import { OID } from './oid.js';

const PlantParams = Type.Object({ plantId: Type.String(OID) });
type PlantParams = Static<typeof PlantParams>;

const PlantScheduleParams = Type.Object({
    plantId: Type.String(OID),
    scheduleId: Type.String(OID)
});
type PlantScheduleParams = Static<typeof PlantScheduleParams>;

// nextDue is computed by the service; careTypeId is re-added with OID constraint
const UpdateScheduleBody = Type.Object({
    ...Type.Omit(UpdateCareScheduleDataSchema, ['nextDue', 'careTypeId']).properties,
    careTypeId: Type.Optional(Type.String(OID))
});
type UpdateScheduleBody = Static<typeof UpdateScheduleBody>;

const { selectedOption, notes, dayOfWeek, dayOfMonth, months } =
    CreateCareScheduleDataSchema.properties;
const CreateScheduleBody = Type.Object({
    careTypeId: Type.String(OID),
    selectedOption: Type.Optional(selectedOption),
    notes: Type.Optional(notes),
    dayOfWeek: Type.Optional(dayOfWeek),
    dayOfMonth: Type.Optional(dayOfMonth),
    months: Type.Optional(months)
});
type CreateScheduleBody = Static<typeof CreateScheduleBody>;

const careSchedulesRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Params: PlantParams }>(
        '/',
        { schema: { params: PlantParams, response: { 200: Type.Array(CareScheduleSchema) } } },
        async (request) => {
            return fastify.careSchedulesService.getByPlantId(
                request.user!.id,
                request.params.plantId
            );
        }
    );

    fastify.get<{ Params: PlantScheduleParams }>(
        '/:scheduleId',
        { schema: { params: PlantScheduleParams, response: { 200: CareScheduleSchema } } },
        async (request, reply) => {
            const { plantId, scheduleId } = request.params;
            const schedule = await fastify.careSchedulesService.getById(
                request.user!.id,
                plantId,
                scheduleId
            );
            if (!schedule) return reply.status(404).send();
            return schedule;
        }
    );

    fastify.post<{ Params: PlantParams; Body: CreateScheduleBody }>(
        '/',
        {
            schema: {
                params: PlantParams,
                body: CreateScheduleBody,
                response: { 201: CareScheduleSchema }
            }
        },
        async (request, reply) => {
            const { plantId } = request.params;
            const { careTypeId, selectedOption, notes, dayOfWeek, dayOfMonth, months } =
                request.body;
            const schedule = await fastify.careSchedulesService.create({
                userId: request.user!.id,
                plantId,
                careTypeId,
                selectedOption: selectedOption ?? null,
                notes: notes ?? null,
                dayOfWeek: dayOfWeek ?? [],
                dayOfMonth: dayOfMonth ?? [],
                months: months ?? []
            });
            return reply
                .status(201)
                .header('Location', `${request.url}/${schedule.id}`)
                .send(schedule);
        }
    );

    fastify.patch<{ Params: PlantScheduleParams; Body: UpdateScheduleBody }>(
        '/:scheduleId',
        {
            schema: {
                params: PlantScheduleParams,
                body: UpdateScheduleBody,
                response: { 200: CareScheduleSchema }
            }
        },
        async (request, reply) => {
            const schedule = await fastify.careSchedulesService.update(
                request.user!.id,
                request.params.scheduleId,
                request.body
            );
            if (!schedule) return reply.status(404).send();
            return schedule;
        }
    );

    fastify.delete<{ Params: PlantScheduleParams }>(
        '/:scheduleId',
        { schema: { params: PlantScheduleParams } },
        async (request, reply) => {
            const deleted = await fastify.careSchedulesService.delete(
                request.user!.id,
                request.params.scheduleId
            );
            if (!deleted) return reply.status(404).send();
            return reply.status(204).send();
        }
    );

    done();
};

export default careSchedulesRoutes;
