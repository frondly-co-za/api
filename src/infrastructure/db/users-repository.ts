import { Db, ObjectId, WithId } from 'mongodb';
import { User, UpsertUserData, UsersRepository } from '$domain/user.js';

interface UserDocument {
    _id: ObjectId;
    auth0Sub: string;
    email: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
}

export class MongoUsersRepository implements UsersRepository {
    private readonly collection;

    constructor(db: Db) {
        this.collection = db.collection<UserDocument>('users');
    }

    private toUser(doc: WithId<UserDocument>): User {
        return {
            id: doc._id.toHexString(),
            auth0Sub: doc.auth0Sub,
            email: doc.email,
            timezone: doc.timezone,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        };
    }

    async findById(id: string): Promise<User | null> {
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toUser(doc) : null;
    }

    async findByAuth0Sub(auth0Sub: string): Promise<User | null> {
        const doc = await this.collection.findOne({ auth0Sub });
        return doc ? this.toUser(doc) : null;
    }

    async upsert(data: UpsertUserData): Promise<User> {
        const now = new Date();
        const result = await this.collection.findOneAndUpdate(
            { auth0Sub: data.auth0Sub },
            {
                $set: { email: data.email, timezone: data.timezone, updatedAt: now },
                $setOnInsert: { createdAt: now }
            },
            { upsert: true, returnDocument: 'after' }
        );
        return this.toUser(result!);
    }
}
