import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import plantsRoute from './routes/plants.js';
import careTypesRoute from './routes/care-types.js';
import dbConnector from './plugins/db-connector.js';
import services from './plugins/services.js';
import auth from './plugins/auth.js';

const fastify = Fastify({ logger: true });

// Dependencies
fastify.register(dbConnector);
fastify.register(services);

// Open routes
fastify.register(swagger, {
    openapi: {
        info: { title: 'Frondly API', version: '0.0.1' }
    }
});
fastify.register(swaggerUi, { routePrefix: '/swagger' });

// Authenticated Routes
fastify.register((authenticatedRoutes, _opts, done) => {
    authenticatedRoutes.register(auth);
    authenticatedRoutes.register(plantsRoute, { prefix: '/plants' });
    authenticatedRoutes.register(careTypesRoute, { prefix: '/care-types' });
    done();
});

export default fastify;
