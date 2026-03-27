import { Db, ObjectId, WithId } from 'mongodb';
import { Plant, PlantRepository } from '$domain/plant/plant.js';

interface PlantDocument {
    _id: ObjectId;
    name: string;
}

export class MongoPlantRepository implements PlantRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<PlantDocument>('plant');
    }

    private toPlant(doc: WithId<PlantDocument>): Plant {
        return { id: doc._id.toHexString(), name: doc.name };
    }

    async findAll(): Promise<Plant[]> {
        const docs = await this.collection.find().toArray();
        return docs.map((doc) => this.toPlant(doc));
    }

    async findById(id: string): Promise<Plant | null> {
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toPlant(doc) : null;
    }

    async create(name: string): Promise<Plant> {
        const _id = new ObjectId();
        await this.collection.insertOne({ _id, name });
        return { id: _id.toHexString(), name };
    }
}
