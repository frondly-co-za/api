import { User, UpsertUserData, UsersRepository } from '$domain/user.js';

export class UsersService {
    constructor(private readonly users: UsersRepository) {}

    upsert(data: UpsertUserData): Promise<User> {
        return this.users.upsert(data);
    }
}
