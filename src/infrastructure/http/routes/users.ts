import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { UserSchema } from '$domain/user.js';

const UpsertUserBody = Type.Object({
    auth0Sub: Type.String(),
    email: Type.String(),
    timezone: Type.String()
});
type UpsertUserBody = Static<typeof UpsertUserBody>;

const UserParams = Type.Object({ id: Type.String({ pattern: '^[0-9a-f]{24}$' }) });
type UserParams = Static<typeof UserParams>;

const usersRoute: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.get<{ Params: UserParams }>(
        '/:id',
        { schema: { params: UserParams, response: { 200: UserSchema } } },
        async (request, reply) => {
            const user = await fastify.usersService.getById(request.params.id);
            if (!user) return reply.status(404).send();
            return user;
        }
    );

    fastify.post<{ Body: UpsertUserBody }>(
        '/',
        { schema: { body: UpsertUserBody, response: { 200: UserSchema } } },
        async (request) => {
            return fastify.usersService.upsert(request.body);
        }
    );

    done();
};

export default usersRoute;
