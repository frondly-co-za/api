import { Static, Type } from 'typebox';
import { FastifyPluginCallback } from 'fastify';
import { Photo, PhotoSchema } from '$domain/photo.js';
import { OID } from './oid.js';
import { signPhotoUrl, verifyPhotoSignature } from '$infrastructure/http/signing/photo-url.js';
import { InvalidImageError } from '$infrastructure/storage/local-photo-storage.js';

const PhotoResponse = Type.Object({
    ...Type.Omit(PhotoSchema, ['uri']).properties,
    url: Type.String()
});
type PhotoResponse = Static<typeof PhotoResponse>;

function withUrl(photo: Photo): PhotoResponse {
    return { ...photo, url: signPhotoUrl(photo.id, process.env.PHOTO_SIGNING_SECRET!) };
}

const PhotoParams = Type.Object({ photoId: Type.String(OID) });
type PhotoParams = Static<typeof PhotoParams>;

const PlantPhotoParams = Type.Object({ plantId: Type.String(OID) });
type PlantPhotoParams = Static<typeof PlantPhotoParams>;

const PlantPhotoQuery = Type.Object(
    { setAsCover: Type.Optional(Type.Boolean()) },
    { additionalProperties: false }
);
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
            { schema: { params: PlantPhotoParams, response: { 200: Type.Array(PhotoResponse) } } },
            async (request, reply) => {
                const { plantId } = request.params;
                const userId = request.user!.id;
                const plant = await fastify.plantsRepository.findById(userId, plantId);
                if (!plant) return reply.status(404).send();
                const photos = await fastify.photosRepository.findAllByPlant(userId, plantId);
                return photos.map(withUrl);
            }
        );

        fastify.post<{ Params: PlantPhotoParams; Querystring: PlantPhotoQuery }>(
            '/',
            {
                schema: {
                    params: PlantPhotoParams,
                    querystring: PlantPhotoQuery,
                    response: { 201: PhotoResponse }
                }
            },
            async (request, reply) => {
                const { plantId } = request.params;
                const userId = request.user!.id;

                const plant = await fastify.plantsRepository.findById(userId, plantId);
                if (!plant) return reply.status(404).send();

                const file = await request.file();
                if (!file) return reply.status(400).send({ message: 'No file uploaded' });

                const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return reply.status(415).send({ message: 'Unsupported file type' });
                }

                const takenAtField = file.fields['takenAt'] as
                    | { type: string; value: unknown }
                    | undefined;
                const takenAt = takenAtField?.type === 'field' ? String(takenAtField.value) : null;

                const buffer = await file.toBuffer();
                let photo;
                try {
                    photo = await fastify.photosService.uploadToPlant(
                        {
                            userId,
                            plantId,
                            buffer,
                            filename: file.filename || null,
                            takenAt,
                            setAsCover: request.query.setAsCover
                        },
                        request.log
                    );
                } catch (err) {
                    if (err instanceof InvalidImageError) {
                        return reply.status(422).send({ message: err.message });
                    }
                    throw err;
                }

                const servePrefix = opts.servePrefix ?? '/photos';
                return reply
                    .status(201)
                    .header('Location', `${servePrefix}/${photo.id}`)
                    .send(withUrl(photo));
            }
        );
    }

    if (opts.context === 'serve') {
        const ServeQuery = Type.Object(
            { expires: Type.String(), sig: Type.String() },
            { additionalProperties: false }
        );
        type ServeQuery = Static<typeof ServeQuery>;

        fastify.get<{ Params: PhotoParams; Querystring: ServeQuery }>(
            '/:photoId',
            { schema: { params: PhotoParams, querystring: ServeQuery } },
            async (request, reply) => {
                const { photoId } = request.params;
                const { expires, sig } = request.query;
                if (
                    !verifyPhotoSignature(photoId, expires, sig, process.env.PHOTO_SIGNING_SECRET!)
                ) {
                    return reply.status(403).send();
                }
                const stream = await fastify.photosService.getFile(photoId);
                if (!stream) return reply.status(404).send();
                stream.on('error', (err) => {
                    request.log.warn({ err, photoId }, 'photo stream error');
                    reply.status(404).send();
                });
                return reply.type('image/webp').send(stream);
            }
        );
    }

    if (opts.context === 'manage') {
        const UrlResponse = Type.Object({ url: Type.String() });

        fastify.get<{ Params: PhotoParams }>(
            '/:photoId/url',
            { schema: { params: PhotoParams, response: { 200: UrlResponse } } },
            async (request, reply) => {
                const photo = await fastify.photosRepository.findById(
                    request.user!.id,
                    request.params.photoId
                );
                if (!photo) return reply.status(404).send();
                return { url: signPhotoUrl(photo.id, process.env.PHOTO_SIGNING_SECRET!) };
            }
        );

        fastify.delete<{ Params: PhotoParams }>(
            '/:photoId',
            { schema: { params: PhotoParams } },
            async (request, reply) => {
                const deleted = await fastify.photosService.delete(
                    request.user!.id,
                    request.params.photoId,
                    request.log
                );
                if (!deleted) return reply.status(404).send();
                return reply.status(204).send();
            }
        );
    }

    done();
};

export default photosRoutes;
