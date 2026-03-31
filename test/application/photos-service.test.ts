import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import { PhotosService } from '$application/photos-service.js';
import type { Photo, PhotosRepository, PhotoStorage } from '$domain/photo.js';
import type { Plant, PlantsRepository } from '$domain/plant.js';

const userId = '507f1f77bcf86cd799439012';
const plantId = '507f1f77bcf86cd799439013';
const photoId = '507f1f77bcf86cd799439011';

const photo: Photo = {
    id: photoId,
    userId,
    plantId,
    uri: `${userId}/${plantId}/${photoId}.webp`,
    takenAt: null,
    originalFilename: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

const plant: Plant = {
    id: plantId,
    userId,
    name: 'Cactus',
    description: null,
    coverPhotoId: null,
    acquiredAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

const mockPhotosRepo: PhotosRepository = {
    findAllByPlant: vi.fn(),
    findById: vi.fn(),
    findByIdPublic: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
};

const mockPlantsRepo: PlantsRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    clearCoverPhoto: vi.fn(),
    delete: vi.fn()
};

const mockStorage: PhotoStorage = {
    save: vi.fn(),
    delete: vi.fn(),
    createReadStream: vi.fn()
};

const service = new PhotosService(mockPhotosRepo, mockPlantsRepo, mockStorage);

beforeEach(() => vi.clearAllMocks());

describe('uploadToPlant', () => {
    const buffer = Buffer.from('fake-image');

    it('saves the file first then creates the DB record', async () => {
        vi.mocked(mockStorage.save).mockResolvedValue();
        vi.mocked(mockPhotosRepo.create).mockResolvedValue(photo);

        const result = await service.uploadToPlant({ userId, plantId, buffer, filename: 'photo.jpg', takenAt: null });

        expect(result).toEqual(photo);
        const saveOrder = vi.mocked(mockStorage.save).mock.invocationCallOrder[0];
        const createOrder = vi.mocked(mockPhotosRepo.create).mock.invocationCallOrder[0];
        expect(saveOrder).toBeLessThan(createOrder);

        const [uri, savedBuffer] = vi.mocked(mockStorage.save).mock.calls[0];
        expect(uri).toMatch(new RegExp(`^${userId}/${plantId}/[a-f0-9]{24}\\.webp$`));
        expect(savedBuffer).toBe(buffer);
    });

    it('passes filename and takenAt to the repo', async () => {
        vi.mocked(mockStorage.save).mockResolvedValue();
        vi.mocked(mockPhotosRepo.create).mockResolvedValue(photo);

        await service.uploadToPlant({ userId, plantId, buffer, filename: 'IMG_001.jpg', takenAt: '2026-01-15T10:00:00.000Z' });

        expect(mockPhotosRepo.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ originalFilename: 'IMG_001.jpg', takenAt: '2026-01-15T10:00:00.000Z' })
        );
    });

    it('sets the photo as cover when setAsCover is true', async () => {
        vi.mocked(mockStorage.save).mockResolvedValue();
        vi.mocked(mockPhotosRepo.create).mockResolvedValue(photo);
        vi.mocked(mockPlantsRepo.update).mockResolvedValue({ ...plant, coverPhotoId: photo.id });

        await service.uploadToPlant({ userId, plantId, buffer, filename: null, takenAt: null, setAsCover: true });

        expect(mockPlantsRepo.update).toHaveBeenCalledExactlyOnceWith(userId, plantId, { coverPhotoId: photo.id });
    });

    it('does not update the plant when setAsCover is omitted', async () => {
        vi.mocked(mockStorage.save).mockResolvedValue();
        vi.mocked(mockPhotosRepo.create).mockResolvedValue(photo);

        await service.uploadToPlant({ userId, plantId, buffer, filename: null, takenAt: null });

        expect(mockPlantsRepo.update).not.toHaveBeenCalled();
    });

    it('deletes the file if the DB create fails', async () => {
        vi.mocked(mockStorage.save).mockResolvedValue();
        vi.mocked(mockPhotosRepo.create).mockRejectedValue(new Error('DB error'));
        vi.mocked(mockStorage.delete).mockResolvedValue();

        await expect(service.uploadToPlant({ userId, plantId, buffer, filename: null, takenAt: null }))
            .rejects.toThrow('DB error');

        expect(mockStorage.delete).toHaveBeenCalledOnce();
    });

    it('still throws the original error if the compensating delete also fails', async () => {
        vi.mocked(mockStorage.save).mockResolvedValue();
        vi.mocked(mockPhotosRepo.create).mockRejectedValue(new Error('DB error'));
        vi.mocked(mockStorage.delete).mockRejectedValue(new Error('fs error'));

        await expect(service.uploadToPlant({ userId, plantId, buffer, filename: null, takenAt: null }))
            .rejects.toThrow('DB error');
    });
});

describe('delete', () => {
    it('returns false when the photo is not found', async () => {
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(null);

        expect(await service.delete(userId, photoId)).toBe(false);
        expect(mockPhotosRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes the DB record, clears the cover photo reference, and deletes the file', async () => {
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(photo);
        vi.mocked(mockPhotosRepo.delete).mockResolvedValue(true);
        vi.mocked(mockPlantsRepo.clearCoverPhoto).mockResolvedValue();
        vi.mocked(mockStorage.delete).mockResolvedValue();

        expect(await service.delete(userId, photoId)).toBe(true);
        expect(mockPhotosRepo.delete).toHaveBeenCalledExactlyOnceWith(userId, photoId);
        expect(mockPlantsRepo.clearCoverPhoto).toHaveBeenCalledExactlyOnceWith(userId, photo.plantId, photoId);
        expect(mockStorage.delete).toHaveBeenCalledExactlyOnceWith(photo.uri);
    });

    it('still returns true if clearCoverPhoto fails', async () => {
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(photo);
        vi.mocked(mockPhotosRepo.delete).mockResolvedValue(true);
        vi.mocked(mockPlantsRepo.clearCoverPhoto).mockRejectedValue(new Error('DB error'));
        vi.mocked(mockStorage.delete).mockResolvedValue();

        expect(await service.delete(userId, photoId)).toBe(true);
    });

    it('still returns true if the file delete fails', async () => {
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(photo);
        vi.mocked(mockPhotosRepo.delete).mockResolvedValue(true);
        vi.mocked(mockPlantsRepo.clearCoverPhoto).mockResolvedValue();
        vi.mocked(mockStorage.delete).mockRejectedValue(new Error('fs error'));

        expect(await service.delete(userId, photoId)).toBe(true);
    });
});

describe('setCoverPhoto', () => {
    const updatedPlant: Plant = { ...plant, coverPhotoId: photoId };

    it('returns null if the photo does not belong to the user', async () => {
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(null);

        expect(await service.setCoverPhoto(userId, plantId, photoId)).toBeNull();
        expect(mockPlantsRepo.update).not.toHaveBeenCalled();
    });

    it('returns null if the photo belongs to a different plant', async () => {
        const otherPlantPhoto = { ...photo, plantId: '507f1f77bcf86cd799439099' };
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(otherPlantPhoto);

        expect(await service.setCoverPhoto(userId, plantId, photoId)).toBeNull();
        expect(mockPlantsRepo.update).not.toHaveBeenCalled();
    });

    it('updates coverPhotoId and returns the updated plant', async () => {
        vi.mocked(mockPhotosRepo.findById).mockResolvedValue(photo);
        vi.mocked(mockPlantsRepo.update).mockResolvedValue(updatedPlant);

        const result = await service.setCoverPhoto(userId, plantId, photoId);

        expect(result).toEqual(updatedPlant);
        expect(mockPlantsRepo.update).toHaveBeenCalledExactlyOnceWith(userId, plantId, { coverPhotoId: photoId });
    });
});

describe('getFile', () => {
    it('returns null when the photo does not exist', async () => {
        vi.mocked(mockPhotosRepo.findByIdPublic).mockResolvedValue(null);

        expect(await service.getFile(photoId)).toBeNull();
        expect(mockStorage.createReadStream).not.toHaveBeenCalled();
    });

    it('returns a read stream for the photo uri', async () => {
        const stream = Readable.from(Buffer.from('data'));
        vi.mocked(mockPhotosRepo.findByIdPublic).mockResolvedValue(photo);
        vi.mocked(mockStorage.createReadStream).mockReturnValue(stream);

        expect(await service.getFile(photoId)).toBe(stream);
        expect(mockStorage.createReadStream).toHaveBeenCalledExactlyOnceWith(photo.uri);
    });
});
