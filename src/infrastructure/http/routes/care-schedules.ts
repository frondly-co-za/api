import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { CareScheduleSchema } from '$domain/care-schedule.js';
import careLogsRoute from './care-logs.js';

const OID = { pattern: '^[0-9a-f]{24}$' };

// plantId comes from the parent prefix; only /:scheduleId belongs to this plugin's own paths.
type PlantParams = { plantId: string };
type ScheduleParams = { plantId: string; scheduleId: string };

const ScheduleIdParams = Type.Object({ scheduleId: Type.String(OID) });

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
    ...RecurrenceFields
});
type UpdateScheduleBody = Static<typeof UpdateScheduleBody>;

const careSchedulesRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get(
        '/',
        { schema: { response: { 200: Type.Array(CareScheduleSchema) } } },
        async (request) => {
            const { plantId } = request.params as PlantParams;
            return fastify.careSchedulesService.getByPlantId(plantId);
        }
    );

    fastify.get<{ Params: ScheduleParams }>(
        '/:scheduleId',
        { schema: { params: ScheduleIdParams, response: { 200: CareScheduleSchema } } },
        async (request, reply) => {
            const schedule = await fastify.careSchedulesService.getById(request.params.scheduleId);
            if (!schedule) return reply.status(404).send();
            return schedule;
        }
    );

    fastify.post<{ Body: CreateScheduleBody }>(
        '/',
        { schema: { body: CreateScheduleBody, response: { 201: CareScheduleSchema } } },
        async (request, reply) => {
            const { plantId } = request.params as PlantParams;
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

    fastify.patch<{ Params: ScheduleParams; Body: UpdateScheduleBody }>(
        '/:scheduleId',
        {
            schema: {
                params: ScheduleIdParams,
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

    fastify.delete<{ Params: ScheduleParams }>(
        '/:scheduleId',
        { schema: { params: ScheduleIdParams } },
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
