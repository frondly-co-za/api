import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '$application/users-service.js';
import type { UsersRepository, UpsertUserData } from '$domain/user.js';
import type { User } from '$domain/user.js';

const mockRepo: UsersRepository = {
    upsert: vi.fn(),
};

const service = new UsersService(mockRepo);

beforeEach(() => vi.clearAllMocks());

const user: User = {
    id: '507f1f77bcf86cd799439011',
    auth0Sub: 'auth0|abc123',
    email: 'test@example.com',
    name: 'Test User',
    timezone: 'Africa/Johannesburg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('upsert', () => {
    it('delegates to repo.upsert with the given data and returns the user', async () => {
        const data: UpsertUserData = {
            auth0Sub: 'auth0|abc123',
            email: 'test@example.com',
            name: 'Test User',
            timezone: 'Africa/Johannesburg',
        };
        vi.mocked(mockRepo.upsert).mockResolvedValue(user);

        expect(await service.upsert(data)).toEqual(user);
        expect(mockRepo.upsert).toHaveBeenCalledExactlyOnceWith(data);
    });
});
