import fastifyPlugin from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import { verifyJwt } from '$infrastructure/auth0/verify-jwt.js';
import { User } from '$domain/user.js';

declare module 'fastify' {
    interface FastifyRequest {
        user: User | null;
    }
}

const authPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.decorateRequest('user', null);

    fastify.addHook('onRequest', async (request, reply) => {
        // Any route can set config: { public: true } to skip auth
        if ((request.routeOptions.config as { public?: boolean })?.public) {
            return;
        }

        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply
                .status(401)
                .send({ statusCode: 401, error: 'Unauthorized', message: 'Missing bearer token' });
        }

        const token = authHeader.slice(7);

        try {
            const payload = await verifyJwt(token);
            const existing = await fastify.usersRepository.findByAuth0Sub(payload.sub);
            request.user =
                existing ??
                (await fastify.usersRepository.upsert({
                    auth0Sub: payload.sub,
                    email: payload.email ?? '',
                    name: payload.name ?? '',
                    timezone: 'Africa/Johannesburg'
                }));
        } catch {
            return reply
                .status(401)
                .send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token' });
        }
    });

    done();
};

export default fastifyPlugin(authPlugin);
