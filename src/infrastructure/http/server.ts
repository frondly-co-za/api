import Fastify from 'fastify';
import plantsRoute from './routes/plants.js';
import dbConnector from './plugins/db-connector.js';
import servicesPlugin from './plugins/services.js';

const fastify = Fastify({ logger: true });

fastify.register(dbConnector);
fastify.register(servicesPlugin);
fastify.register(plantsRoute, { prefix: '/plants' });

export default fastify;
