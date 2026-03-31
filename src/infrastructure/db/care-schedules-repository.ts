import { Db, ObjectId, WithId } from 'mongodb';
import {
    CareSchedule,
    CreateCareScheduleData,
    UpdateCareScheduleData,
    CareSchedulesRepository
} from '$domain/care-schedule.js';

interface CareScheduleDocument {
    _id: ObjectId;
    userId: ObjectId;
    plantId: ObjectId;
    careTypeId: ObjectId;
    selectedOption: string | null;
    notes: string | null;
    dayOfWeek: number[];
    dayOfMonth: number[];
    months: number[];
    nextDue: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class MongoCareSchedulesRepository implements CareSchedulesRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<CareScheduleDocument>('care-schedules');
    }

    private toCareSchedule(doc: WithId<CareScheduleDocument>): CareSchedule {
        return {
            id: doc._id.toHexString(),
            userId: doc.userId.toHexString(),
            plantId: doc.plantId.toHexString(),
            careTypeId: doc.careTypeId.toHexString(),
            selectedOption: doc.selectedOption,
            notes: doc.notes,
            dayOfWeek: doc.dayOfWeek,
            dayOfMonth: doc.dayOfMonth,
            months: doc.months,
            nextDue: doc.nextDue.toISOString(),
            isActive: doc.isActive,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        };
    }

    async findByPlantId(userId: string, plantId: string): Promise<CareSchedule[]> {
        const docs = await this.collection
            .find({ userId: new ObjectId(userId), plantId: new ObjectId(plantId) })
            .toArray();
        return docs.map((doc) => this.toCareSchedule(doc));
    }

    async findDue(userId: string, asOf: string): Promise<CareSchedule[]> {
        const docs = await this.collection
            .find({
                userId: new ObjectId(userId),
                nextDue: { $lte: new Date(asOf) },
                isActive: true
            })
            .toArray();
        return docs.map((doc) => this.toCareSchedule(doc));
    }

    async findById(userId: string, plantId: string, id: string): Promise<CareSchedule | null> {
        const doc = await this.collection.findOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId),
            plantId: new ObjectId(plantId)
        });
        return doc ? this.toCareSchedule(doc) : null;
    }

    async create(data: CreateCareScheduleData): Promise<CareSchedule> {
        const now = new Date();
        const _id = new ObjectId();
        const doc: CareScheduleDocument = {
            _id,
            userId: new ObjectId(data.userId),
            plantId: new ObjectId(data.plantId),
            careTypeId: new ObjectId(data.careTypeId),
            selectedOption: data.selectedOption,
            notes: data.notes,
            dayOfWeek: data.dayOfWeek,
            dayOfMonth: data.dayOfMonth,
            months: data.months,
            nextDue: new Date(data.nextDue),
            isActive: true,
            createdAt: now,
            updatedAt: now
        };
        await this.collection.insertOne(doc);
        return this.toCareSchedule(doc);
    }

    async update(
        userId: string,
        id: string,
        data: UpdateCareScheduleData
    ): Promise<CareSchedule | null> {
        const $set: Partial<CareScheduleDocument> & { updatedAt: Date } = { updatedAt: new Date() };
        if (data.careTypeId !== undefined) $set.careTypeId = new ObjectId(data.careTypeId);
        if (data.selectedOption !== undefined) $set.selectedOption = data.selectedOption;
        if (data.notes !== undefined) $set.notes = data.notes;
        if (data.dayOfWeek !== undefined) $set.dayOfWeek = data.dayOfWeek;
        if (data.dayOfMonth !== undefined) $set.dayOfMonth = data.dayOfMonth;
        if (data.months !== undefined) $set.months = data.months;
        if (data.isActive !== undefined) $set.isActive = data.isActive;
        if (data.nextDue !== undefined) $set.nextDue = new Date(data.nextDue);

        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id), userId: new ObjectId(userId) },
            { $set },
            { returnDocument: 'after' }
        );
        return result ? this.toCareSchedule(result) : null;
    }

    async delete(userId: string, id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId)
        });
        return result.deletedCount > 0;
    }
}
