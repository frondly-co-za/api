import { Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { CareScheduleSchema } from '$domain/care-schedule.js';

const DueQuery = Type.Object({
    asOf: Type.Optional(Type.String({ format: 'date-time' }))
});

const schedulesRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Querystring: { asOf?: string } }>(
        '/due',
        {
            schema: {
                querystring: DueQuery,
                response: { 200: Type.Array(CareScheduleSchema) }
            }
        },
        async (request) => {
            const asOf = request.query.asOf ?? new Date().toISOString();
            return fastify.careSchedulesService.getDue(request.user!.id, asOf);
        }
    );

    done();
};

export default schedulesRoutes;
