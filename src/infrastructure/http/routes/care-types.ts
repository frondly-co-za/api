import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { CareTypeSchema } from '$domain/care-type.js';

const IdParams = Type.Object({ typeId: Type.String({ pattern: '^[0-9a-f]{24}$' }) });
type IdParams = Static<typeof IdParams>;

const CreateCareTypeBody = Type.Object({
    name: Type.String(),
    options: Type.Optional(Type.Array(Type.String()))
});
type CreateCareTypeBody = Static<typeof CreateCareTypeBody>;

const UpdateCareTypeBody = Type.Object({
    name: Type.Optional(Type.String()),
    options: Type.Optional(Type.Array(Type.String()))
});
type UpdateCareTypeBody = Static<typeof UpdateCareTypeBody>;

const careTypesRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get(
        '/',
        { schema: { response: { 200: Type.Array(CareTypeSchema) } } },
        async (request) => {
            return fastify.careTypesService.getAll(request.user!.id);
        }
    );

    fastify.get<{ Params: IdParams }>(
        '/:typeId',
        { schema: { params: IdParams, response: { 200: CareTypeSchema } } },
        async (request, reply) => {
            const careType = await fastify.careTypesService.getById(request.params.typeId);
            if (!careType) return reply.status(404).send();
            return careType;
        }
    );

    fastify.post<{ Body: CreateCareTypeBody }>(
        '/',
        { schema: { body: CreateCareTypeBody, response: { 201: CareTypeSchema } } },
        async (request, reply) => {
            const { name, options } = request.body;
            const careType = await fastify.careTypesService.create({
                userId: request.user!.id,
                name,
                options: options ?? []
            });
            return reply
                .status(201)
                .header('Location', `${request.url}/${careType.id}`)
                .send(careType);
        }
    );

    fastify.patch<{ Params: IdParams; Body: UpdateCareTypeBody }>(
        '/:typeId',
        {
            schema: {
                params: IdParams,
                body: UpdateCareTypeBody,
                response: { 200: CareTypeSchema }
            }
        },
        async (request, reply) => {
            const careType = await fastify.careTypesService.update(
                request.params.typeId,
                request.body
            );
            if (!careType) return reply.status(404).send();
            return careType;
        }
    );

    fastify.delete<{ Params: IdParams }>(
        '/:typeId',
        { schema: { params: IdParams } },
        async (request, reply) => {
            const deleted = await fastify.careTypesService.delete(request.params.typeId);
            if (!deleted) return reply.status(404).send();
            return reply.status(204).send();
        }
    );

    done();
};

export default careTypesRoute;
