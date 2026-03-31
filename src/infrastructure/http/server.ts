import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import plantsRoutes from './routes/plants.js';
import careTypesRoutes from './routes/care-types.js';
import dbConnector from './plugins/db-connector.js';
import services from './plugins/services.js';
import auth from './plugins/auth.js';

const fastify = Fastify({ logger: true });

// Infrastructure
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;
fastify.register(cors, { origin: corsOrigin });
fastify.register(swagger, {
    openapi: {
        info: { title: 'Frondly API', version: '0.0.1' }
    }
});

// Dependencies
fastify.register(dbConnector);
fastify.register(services);

// Open routes
fastify.register(swaggerUi, { routePrefix: '/swagger' });

// Authenticated Routes
fastify.register((authenticatedRoutes, _opts, done) => {
    authenticatedRoutes.register(auth);
    authenticatedRoutes.register(plantsRoutes, { prefix: '/plants' });
    authenticatedRoutes.register(careTypesRoutes, { prefix: '/care-types' });
    done();
});

export default fastify;
