import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import plantsRoute from './routes/plants.js';
import dbConnector from './plugins/db-connector.js';
import services from './plugins/services.js';

const fastify = Fastify({ logger: true });

fastify.register(swagger, {
    openapi: {
        info: { title: 'Frondly API', version: '0.0.1' }
    }
});
fastify.register(swaggerUi, { routePrefix: '/swagger' });

fastify.register(dbConnector);
fastify.register(services);
fastify.register(plantsRoute, { prefix: '/plants' });

export default fastify;
