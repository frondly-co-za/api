import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Db } from 'mongodb';
import { MongoPlantsRepository } from '$infrastructure/db/plants-repository.js';
import { PlantsService } from '$application/plants-service.js';
import { MongoUsersRepository } from '$infrastructure/db/users-repository.js';
import { UsersService } from '$application/users-service.js';
import { MongoCareTypesRepository } from '$infrastructure/db/care-types-repository.js';
import { CareTypesService } from '$application/care-types-service.js';
import { MongoCareSchedulesRepository } from '$infrastructure/db/care-schedules-repository.js';
import { CareSchedulesService } from '$application/care-schedules-service.js';
import { MongoCareLogsRepository } from '$infrastructure/db/care-logs-repository.js';
import { CareLogsService } from '$application/care-logs-service.js';

declare module 'fastify' {
    interface FastifyInstance {
        plantsService: PlantsService;
        usersService: UsersService;
        careTypesService: CareTypesService;
        careSchedulesService: CareSchedulesService;
        careLogsService: CareLogsService;
    }
}

function servicesPlugin(fastify: FastifyInstance) {
    if (!fastify.mongo.db) throw new Error('MongoDB not connected');
    const db: Db = fastify.mongo.db;
    fastify.decorate('plantsService', new PlantsService(new MongoPlantsRepository(db)));
    fastify.decorate('usersService', new UsersService(new MongoUsersRepository(db)));
    fastify.decorate('careTypesService', new CareTypesService(new MongoCareTypesRepository(db)));
    const careSchedulesRepo = new MongoCareSchedulesRepository(db);
    fastify.decorate('careSchedulesService', new CareSchedulesService(careSchedulesRepo));
    fastify.decorate(
        'careLogsService',
        new CareLogsService(new MongoCareLogsRepository(db), careSchedulesRepo)
    );
}

export default fastifyPlugin(servicesPlugin);
