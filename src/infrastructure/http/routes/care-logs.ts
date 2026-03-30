import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { CareLogSchema } from '$domain/care-log.js';

const OID = { pattern: '^[0-9a-f]{24}$' };

// plantId (and optionally scheduleId) always come from parent prefixes.
// Only /:logId belongs to this plugin's own path segments.
type ListParams = { plantId: string; scheduleId?: string };
type ItemParams = { plantId: string; scheduleId?: string; logId: string };

const LogIdParams = Type.Object({ logId: Type.String(OID) });

const SharedLogFields = {
    selectedOption: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    performedAt: Type.Optional(Type.String({ format: 'date-time' }))
};

// Ad-hoc: no schedule to source careTypeId from, so it is required
const AdHocLogBody = Type.Object({ careTypeId: Type.String(OID), ...SharedLogFields });
type AdHocLogBody = Static<typeof AdHocLogBody>;

// Scheduled: careTypeId falls back to the schedule's careTypeId if omitted
const ScheduledLogBody = Type.Object({
    careTypeId: Type.Optional(Type.String(OID)),
    ...SharedLogFields
});
type ScheduledLogBody = Static<typeof ScheduledLogBody>;

export interface CareLogsOptions {
    scheduleContext: boolean;
}

const careLogsRoute: FastifyPluginCallback<CareLogsOptions> = (fastify, opts, done) => {
    fastify.get(
        '/',
        { schema: { response: { 200: Type.Array(CareLogSchema) } } },
        async (request) => {
            const { plantId, scheduleId } = request.params as ListParams;
            return fastify.careLogsService.getByPlantId(plantId, scheduleId);
        }
    );

    fastify.get<{ Params: ItemParams }>(
        '/:logId',
        { schema: { params: LogIdParams, response: { 200: CareLogSchema } } },
        async (request, reply) => {
            const log = await fastify.careLogsService.getById(
                request.params.plantId,
                request.params.logId
            );
            if (!log) return reply.status(404).send();
            return log;
        }
    );

    if (opts.scheduleContext) {
        fastify.post<{ Body: ScheduledLogBody }>(
            '/',
            { schema: { body: ScheduledLogBody, response: { 201: CareLogSchema } } },
            async (request, reply) => {
                const { plantId, scheduleId } = request.params as ListParams;
                const { careTypeId, selectedOption, notes, performedAt } = request.body;
                const log = await fastify.careLogsService.create({
                    userId: request.user!.id,
                    plantId,
                    scheduleId: scheduleId!,
                    careTypeId,
                    selectedOption: selectedOption ?? null,
                    notes: notes ?? null,
                    performedAt: performedAt ?? new Date().toISOString()
                });
                if (!log) return reply.status(404).send();
                const location = `/plants/${plantId}/schedules/${scheduleId}/logs/${log.id}`;
                return reply.status(201).header('Location', location).send(log);
            }
        );
    } else {
        fastify.post<{ Body: AdHocLogBody }>(
            '/',
            { schema: { body: AdHocLogBody, response: { 201: CareLogSchema } } },
            async (request, reply) => {
                const { plantId } = request.params as ListParams;
                const { careTypeId, selectedOption, notes, performedAt } = request.body;
                const log = await fastify.careLogsService.create({
                    userId: request.user!.id,
                    plantId,
                    scheduleId: null,
                    careTypeId,
                    selectedOption: selectedOption ?? null,
                    notes: notes ?? null,
                    performedAt: performedAt ?? new Date().toISOString()
                });
                const location = `/plants/${plantId}/logs/${log!.id}`;
                return reply.status(201).header('Location', location).send(log);
            }
        );
    }

    fastify.delete<{ Params: ItemParams }>(
        '/:logId',
        { schema: { params: LogIdParams } },
        async (request, reply) => {
            const deleted = await fastify.careLogsService.delete(
                request.params.plantId,
                request.params.logId
            );
            if (!deleted) return reply.status(404).send();
            return reply.status(204).send();
        }
    );

    done();
};

export default careLogsRoute;
