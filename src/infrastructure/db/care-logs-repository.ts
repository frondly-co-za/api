import { Db, ObjectId, WithId } from 'mongodb';
import { CareLog, CreateCareLogData, CareLogsRepository } from '$domain/care-log.js';

interface CareLogDocument {
    _id: ObjectId;
    userId: ObjectId;
    plantId: ObjectId;
    scheduleId: ObjectId | null;
    careTypeId: ObjectId;
    selectedOption: string | null;
    notes: string | null;
    performedAt: Date;
    createdAt: Date;
}

export class MongoCareLogsRepository implements CareLogsRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<CareLogDocument>('care-logs');
    }

    private toCareLog(doc: WithId<CareLogDocument>): CareLog {
        return {
            id: doc._id.toHexString(),
            userId: doc.userId.toHexString(),
            plantId: doc.plantId.toHexString(),
            scheduleId: doc.scheduleId ? doc.scheduleId.toHexString() : null,
            careTypeId: doc.careTypeId.toHexString(),
            selectedOption: doc.selectedOption,
            notes: doc.notes,
            performedAt: doc.performedAt.toISOString(),
            createdAt: doc.createdAt.toISOString()
        };
    }

    async findByPlantId(userId: string, plantId: string): Promise<CareLog[]> {
        const docs = await this.collection
            .find({ userId: new ObjectId(userId), plantId: new ObjectId(plantId) })
            .toArray();
        return docs.map((doc) => this.toCareLog(doc));
    }

    async findById(userId: string, plantId: string, id: string): Promise<CareLog | null> {
        const doc = await this.collection.findOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId),
            plantId: new ObjectId(plantId)
        });
        return doc ? this.toCareLog(doc) : null;
    }

    async create(data: CreateCareLogData): Promise<CareLog> {
        const now = new Date();
        const _id = new ObjectId();
        const doc: CareLogDocument = {
            _id,
            userId: new ObjectId(data.userId),
            plantId: new ObjectId(data.plantId),
            scheduleId: data.scheduleId ? new ObjectId(data.scheduleId) : null,
            careTypeId: new ObjectId(data.careTypeId),
            selectedOption: data.selectedOption,
            notes: data.notes,
            performedAt: new Date(data.performedAt),
            createdAt: now
        };
        await this.collection.insertOne(doc);
        return this.toCareLog(doc);
    }

    async delete(userId: string, plantId: string, id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId),
            plantId: new ObjectId(plantId)
        });
        return result.deletedCount > 0;
    }
}
