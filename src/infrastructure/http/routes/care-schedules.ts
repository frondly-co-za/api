import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { CareScheduleSchema } from '$domain/care-schedule.js';
import { OID } from './oid.js';
import careLogsRoute from './care-logs.js';

const PlantParams = Type.Object({ plantId: Type.String(OID) });
type PlantParams = Static<typeof PlantParams>;

const PlantScheduleParams = Type.Object({
    plantId: Type.String(OID),
    scheduleId: Type.String(OID)
});
type PlantScheduleParams = Static<typeof PlantScheduleParams>;

const RecurrenceFields = {
    dayOfWeek: Type.Optional(Type.Array(Type.Integer({ minimum: 0, maximum: 6 }))),
    dayOfMonth: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 31 }))),
    months: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 12 })))
};

const CreateScheduleBody = Type.Object({
    careTypeId: Type.String(OID),
    selectedOption: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    ...RecurrenceFields
});
type CreateScheduleBody = Static<typeof CreateScheduleBody>;

const UpdateScheduleBody = Type.Object({
    careTypeId: Type.Optional(Type.String(OID)),
    selectedOption: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    isActive: Type.Optional(Type.Boolean()),
    ...RecurrenceFields
});
type UpdateScheduleBody = Static<typeof UpdateScheduleBody>;

const careSchedulesRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Params: PlantParams }>(
        '/',
        { schema: { params: PlantParams, response: { 200: Type.Array(CareScheduleSchema) } } },
        async (request) => {
            return fastify.careSchedulesService.getByPlantId(request.params.plantId);
        }
    );

    fastify.get<{ Params: PlantScheduleParams }>(
        '/:scheduleId',
        { schema: { params: PlantScheduleParams, response: { 200: CareScheduleSchema } } },
        async (request, reply) => {
            const { plantId, scheduleId } = request.params;
            const schedule = await fastify.careSchedulesService.getById(plantId, scheduleId);
            if (!schedule) return reply.status(404).send();
            return schedule;
        }
    );

    fastify.post<{ Params: PlantParams; Body: CreateScheduleBody }>(
        '/',
        { schema: { params: PlantParams, body: CreateScheduleBody, response: { 201: CareScheduleSchema } } },
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
            const location = `/plants/${plantId}/schedules/${schedule.id}`;
            return reply.status(201).header('Location', location).send(schedule);
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
            const deleted = await fastify.careSchedulesService.delete(request.params.scheduleId);
            if (!deleted) return reply.status(404).send();
            return reply.status(204).send();
        }
    );

    fastify.register(careLogsRoute, { prefix: '/:scheduleId/logs', scheduleContext: true });
    done();
};

export default careSchedulesRoute;
