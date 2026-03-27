import Fastify from 'fastify';
import plantsRoute from './routes/plants.js';
import dbConnector from './plugins/db-connector.js';
import services from './plugins/services.js';

const fastify = Fastify({ logger: true });

fastify.register(dbConnector);
fastify.register(services);
fastify.register(plantsRoute, { prefix: '/plants' });

export default fastify;
