import { Static, Type } from 'typebox';

export const UserSchema = Type.Object({
    id: Type.String(),
    auth0Sub: Type.String(),
    email: Type.String(),
    timezone: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type User = Static<typeof UserSchema>;

export interface UpsertUserData {
    auth0Sub: string;
    email: string;
    timezone: string;
}

export interface UsersRepository {
    findById(id: string): Promise<User | null>;
    findByAuth0Sub(auth0Sub: string): Promise<User | null>;
    upsert(data: UpsertUserData): Promise<User>;
}
