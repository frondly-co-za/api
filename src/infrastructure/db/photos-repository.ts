import { Db, ObjectId, WithId } from 'mongodb';
import { Photo, CreatePhotoData, PhotosRepository } from '$domain/photo.js';

interface PhotoDocument {
    _id: ObjectId;
    userId: ObjectId;
    plantId: ObjectId;
    uri: string;
    takenAt: Date | null;
    originalFilename: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class MongoPhotosRepository implements PhotosRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<PhotoDocument>('photos');
    }

    private toPhoto(doc: WithId<PhotoDocument>): Photo {
        return {
            id: doc._id.toHexString(),
            userId: doc.userId.toHexString(),
            plantId: doc.plantId.toHexString(),
            uri: doc.uri,
            takenAt: doc.takenAt ? doc.takenAt.toISOString() : null,
            originalFilename: doc.originalFilename,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        };
    }

    async findAllByPlant(userId: string, plantId: string): Promise<Photo[]> {
        const docs = await this.collection
            .find({ userId: new ObjectId(userId), plantId: new ObjectId(plantId) })
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map((doc) => this.toPhoto(doc));
    }

    async findById(userId: string, id: string): Promise<Photo | null> {
        const doc = await this.collection.findOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId)
        });
        return doc ? this.toPhoto(doc) : null;
    }

    async findByIdPublic(id: string): Promise<Photo | null> {
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toPhoto(doc) : null;
    }

    async create(data: CreatePhotoData): Promise<Photo> {
        const now = new Date();
        const doc: PhotoDocument = {
            _id: new ObjectId(data.id),
            userId: new ObjectId(data.userId),
            plantId: new ObjectId(data.plantId),
            uri: data.uri,
            takenAt: data.takenAt ? new Date(data.takenAt) : null,
            originalFilename: data.originalFilename,
            createdAt: now,
            updatedAt: now
        };
        await this.collection.insertOne(doc);
        return this.toPhoto(doc);
    }

    async delete(userId: string, id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId)
        });
        return result.deletedCount > 0;
    }
}
