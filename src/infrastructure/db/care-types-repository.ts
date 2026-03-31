import { Db, ObjectId, WithId } from 'mongodb';
import {
    CareType,
    CreateCareTypeData,
    UpdateCareTypeData,
    CareTypesRepository
} from '$domain/care-type.js';

interface CareTypeDocument {
    _id: ObjectId;
    userId: ObjectId | null;
    name: string;
    options: string[];
    createdAt: Date;
    updatedAt: Date;
}

export class MongoCareTypesRepository implements CareTypesRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<CareTypeDocument>('care-types');
    }

    private toCareType(doc: WithId<CareTypeDocument>): CareType {
        return {
            id: doc._id.toHexString(),
            userId: doc.userId ? doc.userId.toHexString() : null,
            name: doc.name,
            options: doc.options,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        };
    }

    async findAll(userId: string): Promise<CareType[]> {
        const docs = await this.collection
            .find({ $or: [{ userId: null }, { userId: new ObjectId(userId) }] })
            .toArray();
        return docs.map((doc) => this.toCareType(doc));
    }

    async findById(userId: string, id: string): Promise<CareType | null> {
        const doc = await this.collection.findOne({
            _id: new ObjectId(id),
            $or: [{ userId: null }, { userId: new ObjectId(userId) }]
        });
        return doc ? this.toCareType(doc) : null;
    }

    async create(data: CreateCareTypeData): Promise<CareType> {
        const now = new Date();
        const _id = new ObjectId();
        const doc: CareTypeDocument = {
            _id,
            userId: new ObjectId(data.userId),
            name: data.name,
            options: data.options,
            createdAt: now,
            updatedAt: now
        };
        await this.collection.insertOne(doc);
        return this.toCareType(doc);
    }

    async update(userId: string, id: string, data: UpdateCareTypeData): Promise<CareType | null> {
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id), userId: new ObjectId(userId) },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        return result ? this.toCareType(result) : null;
    }

    async delete(userId: string, id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId)
        });
        return result.deletedCount > 0;
    }
}
