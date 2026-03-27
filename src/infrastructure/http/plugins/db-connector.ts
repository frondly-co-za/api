import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyMongo from '@fastify/mongodb';

function dbConnector(fastify: FastifyInstance) {
    fastify.register(fastifyMongo, {
        url: process.env.MONGODB_URI
    });
}

export default fastifyPlugin(dbConnector);
