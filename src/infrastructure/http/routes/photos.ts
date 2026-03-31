import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { PhotoSchema } from '$domain/photo.js';
import { OID } from './oid.js';

const PhotoParams = Type.Object({ photoId: Type.String(OID) });
type PhotoParams = Static<typeof PhotoParams>;

const PlantPhotoParams = Type.Object({ plantId: Type.String(OID) });
type PlantPhotoParams = Static<typeof PlantPhotoParams>;

const PlantPhotoQuery = Type.Object({ setAsCover: Type.Optional(Type.Boolean()) });
type PlantPhotoQuery = Static<typeof PlantPhotoQuery>;

export type PhotosContext = 'plant' | 'serve' | 'manage';

export interface PhotosOptions {
    context: PhotosContext;
    servePrefix?: string;
}

const photosRoutes: FastifyPluginCallback<PhotosOptions> = (fastify, opts, done) => {
    if (opts.context === 'plant') {
        fastify.get<{ Params: PlantPhotoParams }>(
            '/',
            { schema: { params: PlantPhotoParams, response: { 200: Type.Array(PhotoSchema) } } },
            async (request, reply) => {
                const { plantId } = request.params;
                const userId = request.user!.id;
                const plant = await fastify.plantsRepository.findById(userId, plantId);
                if (!plant) return reply.status(404).send();
                return fastify.photosRepository.findAllByPlant(userId, plantId);
            }
        );

        fastify.post<{ Params: PlantPhotoParams; Querystring: PlantPhotoQuery }>(
            '/',
            {
                schema: {
                    params: PlantPhotoParams,
                    querystring: PlantPhotoQuery,
                    response: { 201: PhotoSchema }
                }
            },
            async (request, reply) => {
                const { plantId } = request.params;
                const userId = request.user!.id;

                const plant = await fastify.plantsRepository.findById(userId, plantId);
                if (!plant) return reply.status(404).send();

                const file = await request.file();
                if (!file) return reply.status(400).send({ message: 'No file uploaded' });

                const takenAtField = file.fields['takenAt'] as
                    | { type: string; value: unknown }
                    | undefined;
                const takenAt = takenAtField?.type === 'field' ? String(takenAtField.value) : null;

                const buffer = await file.toBuffer();
                const photo = await fastify.photosService.uploadToPlant({
                    userId,
                    plantId,
                    buffer,
                    filename: file.filename || null,
                    takenAt,
                    setAsCover: request.query.setAsCover
                });

                const servePrefix = opts.servePrefix ?? '/photos';
                return reply
                    .status(201)
                    .header('Location', `${servePrefix}/${photo.id}`)
                    .send(photo);
            }
        );
    }

    if (opts.context === 'serve') {
        fastify.get<{ Params: PhotoParams }>(
            '/:photoId',
            { schema: { params: PhotoParams } },
            async (request, reply) => {
                const stream = await fastify.photosService.getFile(request.params.photoId);
                if (!stream) return reply.status(404).send();
                stream.on('error', () => {
                    reply.status(404).send();
                });
                return reply.type('image/webp').send(stream);
            }
        );
    }

    if (opts.context === 'manage') {
        fastify.delete<{ Params: PhotoParams }>(
            '/:photoId',
            { schema: { params: PhotoParams } },
            async (request, reply) => {
                const deleted = await fastify.photosService.delete(
                    request.user!.id,
                    request.params.photoId
                );
                if (!deleted) return reply.status(404).send();
                return reply.status(204).send();
            }
        );
    }

    done();
};

export default photosRoutes;
