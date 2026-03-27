import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Db } from 'mongodb';
import { MongoPlantRepository } from '$infrastructure/db/plantRepository.js';
import { PlantService } from '$application/plant/plantService.js';

declare module 'fastify' {
    interface FastifyInstance {
        plantService: PlantService;
    }
}

function servicesPlugin(fastify: FastifyInstance) {
    if (!fastify.mongo.db) throw new Error('MongoDB not connected');
    const db: Db = fastify.mongo.db;
    const plantRepo = new MongoPlantRepository(db);
    fastify.decorate('plantService', new PlantService(plantRepo));
}

export default fastifyPlugin(servicesPlugin);
