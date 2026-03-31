import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Db } from 'mongodb';
import { MongoPlantsRepository } from '$infrastructure/db/plants-repository.js';
import { MongoUsersRepository } from '$infrastructure/db/users-repository.js';
import { MongoCareTypesRepository } from '$infrastructure/db/care-types-repository.js';
import { MongoCareSchedulesRepository } from '$infrastructure/db/care-schedules-repository.js';
import { CareSchedulesService } from '$application/care-schedules-service.js';
import { MongoCareLogsRepository } from '$infrastructure/db/care-logs-repository.js';
import { CareLogsService } from '$application/care-logs-service.js';
import { PlantsRepository } from '$domain/plant.js';
import { UsersRepository } from '$domain/user.js';
import { CareTypesRepository } from '$domain/care-type.js';

declare module 'fastify' {
    interface FastifyInstance {
        plantsRepository: PlantsRepository;
        usersRepository: UsersRepository;
        careTypesRepository: CareTypesRepository;
        careSchedulesService: CareSchedulesService;
        careLogsService: CareLogsService;
    }
}

function servicesPlugin(fastify: FastifyInstance) {
    if (!fastify.mongo.db) throw new Error('MongoDB not connected');
    const db: Db = fastify.mongo.db;
    fastify.decorate('plantsRepository', new MongoPlantsRepository(db));
    fastify.decorate('usersRepository', new MongoUsersRepository(db));
    fastify.decorate('careTypesRepository', new MongoCareTypesRepository(db));
    const careSchedulesRepo = new MongoCareSchedulesRepository(db);
    fastify.decorate('careSchedulesService', new CareSchedulesService(careSchedulesRepo));
    fastify.decorate(
        'careLogsService',
        new CareLogsService(new MongoCareLogsRepository(db), careSchedulesRepo)
    );
}

export default fastifyPlugin(servicesPlugin);
