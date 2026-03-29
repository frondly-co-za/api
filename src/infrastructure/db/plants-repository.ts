import { Db, ObjectId, WithId } from 'mongodb';
import { Plant, CreatePlantData, PlantsRepository } from '$domain/plant.js';

interface PlantDocument {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    description: string | null;
    photoUrl: string | null;
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
            photoUrl: doc.photoUrl,
            acquiredAt: doc.acquiredAt ? doc.acquiredAt.toISOString() : null,
            notes: doc.notes,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        };
    }

    async findAll(userId: string): Promise<Plant[]> {
        const docs = await this.collection.find({ userId: new ObjectId(userId) }).toArray();
        return docs.map((doc) => this.toPlant(doc));
    }

    async findById(id: string): Promise<Plant | null> {
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toPlant(doc) : null;
    }

    async create(data: CreatePlantData): Promise<Plant> {
        const now = new Date();
        const _id = new ObjectId();
        const doc: PlantDocument = {
            _id,
            userId: new ObjectId(data.userId),
            name: data.name,
            description: data.description,
            photoUrl: data.photoUrl,
            acquiredAt: data.acquiredAt ? new Date(data.acquiredAt) : null,
            notes: data.notes,
            createdAt: now,
            updatedAt: now
        };
        await this.collection.insertOne(doc);
        return this.toPlant(doc);
    }
}
