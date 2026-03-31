import { Readable } from 'stream';
import { Static, Type } from 'typebox';

export const PhotoSchema = Type.Object({
    id: Type.String(),
    userId: Type.String(),
    plantId: Type.String(),
    uri: Type.String(),
    takenAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    originalFilename: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type Photo = Static<typeof PhotoSchema>;

export interface CreatePhotoData {
    id: string;
    userId: string;
    plantId: string;
    uri: string;
    takenAt: string | null;
    originalFilename: string | null;
}

export interface UploadToPlantData {
    userId: string;
    plantId: string;
    buffer: Buffer;
    filename: string | null;
    takenAt: string | null;
    setAsCover?: boolean;
}

export interface PhotosRepository {
    findAllByPlant(userId: string, plantId: string): Promise<Photo[]>;
    findById(userId: string, id: string): Promise<Photo | null>;
    findByIdPublic(id: string): Promise<Photo | null>;
    create(data: CreatePhotoData): Promise<Photo>;
    delete(userId: string, id: string): Promise<boolean>;
}

export interface PhotoStorage {
    save(uri: string, buffer: Buffer): Promise<void>;
    delete(uri: string): Promise<void>;
    createReadStream(uri: string): Readable;
}
