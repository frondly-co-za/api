import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { CareLogSchema } from '$domain/care-log.js';
import { OID } from './oid.js';

const LogBody = Type.Object({
    careTypeId: Type.String(OID),
    scheduleId: Type.Optional(Type.String(OID)),
    selectedOption: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    performedAt: Type.Optional(Type.String({ format: 'date-time' }))
});
type LogBody = Static<typeof LogBody>;

const LogParams = Type.Object({ plantId: Type.String(OID) });
type LogParams = Static<typeof LogParams>;

const LogItemParams = Type.Object({ plantId: Type.String(OID), logId: Type.String(OID) });
type LogItemParams = Static<typeof LogItemParams>;

const careLogsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Params: LogParams }>(
        '/',
        { schema: { params: LogParams, response: { 200: Type.Array(CareLogSchema) } } },
        async (request) => {
            return fastify.careLogsService.getByPlantId(request.user!.id, request.params.plantId);
        }
    );

    fastify.get<{ Params: LogItemParams }>(
        '/:logId',
        { schema: { params: LogItemParams, response: { 200: CareLogSchema } } },
        async (request, reply) => {
            const log = await fastify.careLogsService.getById(
                request.user!.id,
                request.params.plantId,
                request.params.logId
            );
            if (!log) return reply.status(404).send();
            return log;
        }
    );

    fastify.post<{ Body: LogBody; Params: LogParams }>(
        '/',
        { schema: { params: LogParams, body: LogBody, response: { 201: CareLogSchema } } },
        async (request, reply) => {
            const { plantId } = request.params;
            const { careTypeId, scheduleId, selectedOption, notes, performedAt } = request.body;
            const log = await fastify.careLogsService.create({
                userId: request.user!.id,
                plantId,
                scheduleId: scheduleId ?? null,
                careTypeId,
                selectedOption: selectedOption ?? null,
                notes: notes ?? null,
                performedAt: performedAt ?? new Date().toISOString()
            });
            if (!log) return reply.status(404).send();
            return reply
                .status(201)
                .header('Location', `/plants/${plantId}/logs/${log.id}`)
                .send(log);
        }
    );

    fastify.delete<{ Params: LogItemParams }>(
        '/:logId',
        { schema: { params: LogItemParams } },
        async (request, reply) => {
            const deleted = await fastify.careLogsService.delete(
                request.user!.id,
                request.params.plantId,
                request.params.logId
            );
            if (!deleted) return reply.status(404).send();
            return reply.status(204).send();
        }
    );

    done();
};

export default careLogsRoutes;
