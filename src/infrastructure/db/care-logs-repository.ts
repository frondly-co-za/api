import { Db, ObjectId, WithId } from 'mongodb';
import { CareLog, ResolvedCreateCareLogData, CareLogsRepository } from '$domain/care-log.js';

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

    async findByPlantId(plantId: string, scheduleId?: string): Promise<CareLog[]> {
        const query: Record<string, unknown> = { plantId: new ObjectId(plantId) };
        if (scheduleId !== undefined) query.scheduleId = new ObjectId(scheduleId);
        const docs = await this.collection.find(query).toArray();
        return docs.map((doc) => this.toCareLog(doc));
    }

    async findById(plantId: string, id: string): Promise<CareLog | null> {
        const doc = await this.collection.findOne({
            _id: new ObjectId(id),
            plantId: new ObjectId(plantId)
        });
        return doc ? this.toCareLog(doc) : null;
    }

    async create(data: ResolvedCreateCareLogData): Promise<CareLog> {
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

    async delete(plantId: string, id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: new ObjectId(id),
            plantId: new ObjectId(plantId)
        });
        return result.deletedCount > 0;
    }
}
