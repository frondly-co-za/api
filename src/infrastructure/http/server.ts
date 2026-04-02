import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import plantsRoutes from './routes/plants.js';
import careTypesRoutes from './routes/care-types.js';
import schedulesRoutes from './routes/schedules.js';
import photosRoutes from './routes/photos.js';
import dbConnector from './plugins/db-connector.js';
import services from './plugins/services.js';
import auth from './plugins/auth.js';

const fastify = Fastify({
    trustProxy: true,
    ajv: { customOptions: { removeAdditional: false } },
    logger: process.env.LOG_FILE
        ? {
              level: process.env.LOG_LEVEL ?? 'info',
              transport: {
                  targets: [
                      { target: 'pino/file', options: { destination: 1 } },
                      {
                          target: 'pino-roll',
                          options: {
                              file: process.env.LOG_FILE,
                              size: '10m',
                              limit: { count: 5 },
                              mkdir: true
                          }
                      }
                  ]
              }
          }
        : { level: process.env.LOG_LEVEL ?? 'info' }
});

// Infrastructure
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : false;
fastify.log.info({ origins: corsOrigin }, 'CORS configured');
fastify.register(cors, { origin: corsOrigin });
fastify.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' }
});
fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
});
fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

// Dependencies
fastify.register(dbConnector);
fastify.register(services);

if (process.env.NODE_ENV !== 'production') {
    const { default: swagger } = await import('@fastify/swagger');
    const { default: swaggerUi } = await import('@fastify/swagger-ui');
    fastify.register(swagger, {
        openapi: {
            info: { title: 'Frondly API', version: '0.0.1' }
        }
    });
    fastify.register(swaggerUi, { routePrefix: '/swagger' });
}

// Open routes
fastify.get('/health', async (_request, reply) => {
    try {
        await fastify.mongo.db?.admin().ping();
        return reply.send({ status: 'ok' });
    } catch {
        return reply.status(503).send({ status: 'unavailable' });
    }
});

fastify.register(photosRoutes, { prefix: '/photos', context: 'serve' });

// Authenticated Routes
fastify.register((authenticatedRoutes, _opts, done) => {
    authenticatedRoutes.register(auth);
    authenticatedRoutes.register(plantsRoutes, { prefix: '/plants' });
    authenticatedRoutes.register(careTypesRoutes, { prefix: '/care-types' });
    authenticatedRoutes.register(schedulesRoutes, { prefix: '/schedules' });
    authenticatedRoutes.register(photosRoutes, { prefix: '/photos', context: 'manage' });
    done();
});

export default fastify;
