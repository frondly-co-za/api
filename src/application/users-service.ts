import { User, UpsertUserData, UsersRepository } from '$domain/user.js';

export class UsersService {
    constructor(private readonly users: UsersRepository) {}

    getById(id: string): Promise<User | null> {
        return this.users.findById(id);
    }

    getByAuth0Sub(auth0Sub: string): Promise<User | null> {
        return this.users.findByAuth0Sub(auth0Sub);
    }

    upsert(data: UpsertUserData): Promise<User> {
        return this.users.upsert(data);
    }
}
