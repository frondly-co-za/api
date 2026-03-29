import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Db } from 'mongodb';
import { MongoPlantsRepository } from '$infrastructure/db/plants-repository.js';
import { PlantsService } from '$application/plants-service.js';
import { MongoUsersRepository } from '$infrastructure/db/users-repository.js';
import { UsersService } from '$application/users-service.js';

declare module 'fastify' {
    interface FastifyInstance {
        plantsService: PlantsService;
        usersService: UsersService;
    }
}

function servicesPlugin(fastify: FastifyInstance) {
    if (!fastify.mongo.db) throw new Error('MongoDB not connected');
    const db: Db = fastify.mongo.db;
    fastify.decorate('plantsService', new PlantsService(new MongoPlantsRepository(db)));
    fastify.decorate('usersService', new UsersService(new MongoUsersRepository(db)));
}

export default fastifyPlugin(servicesPlugin);
