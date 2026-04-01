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
import { MongoPhotosRepository } from '$infrastructure/db/photos-repository.js';
import { LocalPhotoStorage } from '$infrastructure/storage/local-photo-storage.js';
import { PhotosService } from '$application/photos-service.js';
import { PlantsRepository } from '$domain/plant.js';
import { UsersRepository } from '$domain/user.js';
import { CareTypesRepository } from '$domain/care-type.js';
import { PhotosRepository } from '$domain/photo.js';

declare module 'fastify' {
    interface FastifyInstance {
        plantsRepository: PlantsRepository;
        usersRepository: UsersRepository;
        careTypesRepository: CareTypesRepository;
        careSchedulesService: CareSchedulesService;
        careLogsService: CareLogsService;
        photosRepository: PhotosRepository;
        photosService: PhotosService;
    }
}

function servicesPlugin(fastify: FastifyInstance) {
    if (!fastify.mongo.db) throw new Error('MongoDB not connected');
    const db: Db = fastify.mongo.db;
    const plantsRepo = new MongoPlantsRepository(db);
    fastify.decorate('plantsRepository', plantsRepo);
    fastify.decorate('usersRepository', new MongoUsersRepository(db));
    fastify.decorate('careTypesRepository', new MongoCareTypesRepository(db));
    const careSchedulesRepo = new MongoCareSchedulesRepository(db);
    fastify.decorate(
        'careSchedulesService',
        new CareSchedulesService(careSchedulesRepo, fastify.log)
    );
    fastify.decorate(
        'careLogsService',
        new CareLogsService(new MongoCareLogsRepository(db), careSchedulesRepo, fastify.log)
    );
    const photosRepo = new MongoPhotosRepository(db);
    const photoStorage = new LocalPhotoStorage(
        process.env.PHOTO_STORAGE_PATH ?? './uploads',
        fastify.log
    );
    fastify.decorate('photosRepository', photosRepo);
    fastify.decorate(
        'photosService',
        new PhotosService(photosRepo, plantsRepo, photoStorage, fastify.log)
    );
}

export default fastifyPlugin(servicesPlugin);
