import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { Photo, PhotosRepository, PhotoStorage, UploadToPlantData } from '$domain/photo.js';
import { Plant, PlantsRepository } from '$domain/plant.js';

export class PhotosService {
    constructor(
        private readonly photosRepo: PhotosRepository,
        private readonly plantsRepo: PlantsRepository,
        private readonly storage: PhotoStorage
    ) {}

    async uploadToPlant(data: UploadToPlantData): Promise<Photo> {
        const { userId, plantId, buffer, filename, takenAt, setAsCover } = data;
        const photoId = randomBytes(12).toString('hex');
        const uri = `${userId}/${plantId}/${photoId}.webp`;

        await this.storage.save(uri, buffer);

        try {
            const photo = await this.photosRepo.create({
                id: photoId,
                userId,
                plantId,
                uri,
                takenAt,
                originalFilename: filename
            });
            if (setAsCover) {
                await this.plantsRepo.update(userId, plantId, { coverPhotoId: photo.id });
            }
            return photo;
        } catch (err) {
            await this.storage.delete(uri).catch(() => {});
            throw err;
        }
    }

    async delete(userId: string, photoId: string): Promise<boolean> {
        const photo = await this.photosRepo.findById(userId, photoId);
        if (!photo) return false;

        await this.photosRepo.delete(userId, photoId);

        await this.plantsRepo.clearCoverPhoto(userId, photo.plantId, photoId).catch(() => {});
        await this.storage.delete(photo.uri).catch(() => {});

        return true;
    }

    async setCoverPhoto(userId: string, plantId: string, photoId: string): Promise<Plant | null> {
        const photo = await this.photosRepo.findById(userId, photoId);
        if (!photo || photo.plantId !== plantId) return null;
        return this.plantsRepo.update(userId, plantId, { coverPhotoId: photoId });
    }

    async getFile(photoId: string): Promise<Readable | null> {
        const photo = await this.photosRepo.findByIdPublic(photoId);
        if (!photo) return null;
        return this.storage.createReadStream(photo.uri);
    }
}
