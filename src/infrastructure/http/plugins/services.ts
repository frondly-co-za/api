import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Db } from 'mongodb';
import { MongoPlantsRepository } from '$infrastructure/db/plants-repository.js';
import { PlantsService } from '$application/plants-service.js';

declare module 'fastify' {
    interface FastifyInstance {
        plantsService: PlantsService;
    }
}

function servicesPlugin(fastify: FastifyInstance) {
    if (!fastify.mongo.db) throw new Error('MongoDB not connected');
    const db: Db = fastify.mongo.db;
    const plantsRepo = new MongoPlantsRepository(db);
    fastify.decorate('plantsService', new PlantsService(plantsRepo));
}

export default fastifyPlugin(servicesPlugin);
