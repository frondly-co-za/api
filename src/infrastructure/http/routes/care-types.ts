import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import {
    CareTypeSchema,
    CreateCareTypeDataSchema,
    UpdateCareTypeDataSchema
} from '$domain/care-type.js';
import { OID } from './oid.js';

const IdParams = Type.Object({ typeId: Type.String(OID) });
type IdParams = Static<typeof IdParams>;

const UpdateCareTypeBody = Type.Object(UpdateCareTypeDataSchema.properties, {
    additionalProperties: false
});
type UpdateCareTypeBody = Static<typeof UpdateCareTypeBody>;

const { name, options } = CreateCareTypeDataSchema.properties;
const CreateCareTypeBody = Type.Object(
    { name, options: Type.Optional(options) },
    { additionalProperties: false }
);
type CreateCareTypeBody = Static<typeof CreateCareTypeBody>;

const careTypesRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get(
        '/',
        { schema: { response: { 200: Type.Array(CareTypeSchema) } } },
        async (request) => {
            return fastify.careTypesRepository.findAll(request.user!.id);
        }
    );

    fastify.get<{ Params: IdParams }>(
        '/:typeId',
        { schema: { params: IdParams, response: { 200: CareTypeSchema } } },
        async (request, reply) => {
            const careType = await fastify.careTypesRepository.findById(
                request.user!.id,
                request.params.typeId
            );
            if (!careType) return reply.status(404).send();
            return careType;
        }
    );

    fastify.post<{ Body: CreateCareTypeBody }>(
        '/',
        { schema: { body: CreateCareTypeBody, response: { 201: CareTypeSchema } } },
        async (request, reply) => {
            const { name, options } = request.body;
            const careType = await fastify.careTypesRepository.create({
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
            const { name, options } = request.body;
            const careType = await fastify.careTypesRepository.update(
                request.user!.id,
                request.params.typeId,
                { name, options }
            );
            if (!careType) return reply.status(404).send();
            return careType;
        }
    );

    fastify.delete<{ Params: IdParams }>(
        '/:typeId',
        { schema: { params: IdParams } },
        async (request, reply) => {
            const deleted = await fastify.careTypesRepository.delete(
                request.user!.id,
                request.params.typeId
            );
            if (!deleted) return reply.status(404).send();
            return reply.status(204).send();
        }
    );

    done();
};

export default careTypesRoutes;
