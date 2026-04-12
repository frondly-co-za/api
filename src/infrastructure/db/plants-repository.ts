import { Db, ObjectId, WithId } from 'mongodb';
import { Plant, CreatePlantData, UpdatePlantData, PlantsRepository } from '$domain/plant.js';
import type { CareSchedule } from '$domain/care-schedule.js';
import type { CareLog } from '$domain/care-log.js';
import type { CareScheduleDocument } from './care-schedules-repository.js';
import type { CareLogDocument } from './care-logs-repository.js';

interface PlantDocument {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    description: string | null;
    coverPhotoId: ObjectId | null;
    acquiredAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class MongoPlantsRepository implements PlantsRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<PlantDocument>('plants');
    }

    private toPlant(doc: WithId<PlantDocument>): Plant {
        return {
            id: doc._id.toHexString(),
            userId: doc.userId.toHexString(),
            name: doc.name,
            description: doc.description,
            coverPhotoId: doc.coverPhotoId ? doc.coverPhotoId.toHexString() : null,
            acquiredAt: doc.acquiredAt ? doc.acquiredAt.toISOString() : null,
            notes: doc.notes,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        };
    }

    async findAll(userId: string, include?: string[]): Promise<Plant[]> {
        if (!include || include.length === 0) {
            const docs = await this.collection.find({ userId: new ObjectId(userId) }).toArray();
            return docs.map((doc) => this.toPlant(doc));
        }

        const pipeline: object[] = [{ $match: { userId: new ObjectId(userId) } }];

        if (include.includes('schedules')) {
            pipeline.push({
                $lookup: {
                    from: 'care-schedules',
                    localField: '_id',
                    foreignField: 'plantId',
                    as: 'schedules'
                }
            });
        }

        if (include.includes('recentLogs')) {
            pipeline.push({
                $lookup: {
                    from: 'care-logs',
                    let: { plantId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$plantId', '$$plantId'] } } },
                        { $sort: { performedAt: -1 } },
                        { $limit: 5 }
                    ],
                    as: 'recentLogs'
                }
            });
        }

        const docs = await this.collection
            .aggregate<
                PlantDocument & {
                    schedules?: WithId<CareScheduleDocument>[];
                    recentLogs?: WithId<CareLogDocument>[];
                }
            >(pipeline)
            .toArray();

        return docs.map((doc) => {
            const plant = this.toPlant(doc as WithId<PlantDocument>);
            if (include.includes('schedules') && doc.schedules) {
                plant.schedules = doc.schedules.map((s) => this.toEmbeddedSchedule(s));
            }
            if (include.includes('recentLogs') && doc.recentLogs) {
                plant.recentLogs = doc.recentLogs.map((l) => this.toEmbeddedLog(l));
            }
            return plant;
        });
    }

    private toEmbeddedSchedule(doc: WithId<CareScheduleDocument>): CareSchedule {
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

    private toEmbeddedLog(doc: WithId<CareLogDocument>): CareLog {
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

    async findById(userId: string, id: string): Promise<Plant | null> {
        const doc = await this.collection.findOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId)
        });
        return doc ? this.toPlant(doc) : null;
    }

    async create(data: CreatePlantData): Promise<Plant> {
        const now = new Date();
        const _id = data.id ? new ObjectId(data.id) : new ObjectId();
        const doc: PlantDocument = {
            _id,
            userId: new ObjectId(data.userId),
            name: data.name,
            description: data.description,
            coverPhotoId: null,
            acquiredAt: data.acquiredAt ? new Date(data.acquiredAt) : null,
            notes: data.notes,
            createdAt: now,
            updatedAt: now
        };
        await this.collection.insertOne(doc);
        return this.toPlant(doc);
    }

    async update(userId: string, id: string, data: UpdatePlantData): Promise<Plant | null> {
        const $set: Partial<PlantDocument> & { updatedAt: Date } = { updatedAt: new Date() };
        if (data.name !== undefined) $set.name = data.name;
        if (data.description !== undefined) $set.description = data.description;
        if (data.notes !== undefined) $set.notes = data.notes;
        if (data.acquiredAt !== undefined)
            $set.acquiredAt = data.acquiredAt ? new Date(data.acquiredAt) : null;
        if (data.coverPhotoId !== undefined)
            $set.coverPhotoId = data.coverPhotoId ? new ObjectId(data.coverPhotoId) : null;
        const filter: Parameters<typeof this.collection.findOneAndUpdate>[0] = {
            _id: new ObjectId(id),
            userId: new ObjectId(userId),
            ...(data.updatedAt ? { updatedAt: { $lte: new Date(data.updatedAt) } } : {})
        };
        const result = await this.collection.findOneAndUpdate(
            filter,
            { $set },
            { returnDocument: 'after' }
        );
        return result ? this.toPlant(result) : null;
    }

    async clearCoverPhoto(userId: string, plantId: string, photoId: string): Promise<void> {
        await this.collection.updateOne(
            {
                _id: new ObjectId(plantId),
                userId: new ObjectId(userId),
                coverPhotoId: new ObjectId(photoId)
            },
            { $set: { coverPhotoId: null, updatedAt: new Date() } }
        );
    }

    async delete(userId: string, id: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: new ObjectId(id),
            userId: new ObjectId(userId)
        });
        return result.deletedCount > 0;
    }
}
