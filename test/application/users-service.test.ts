import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '$application/users-service.js';
import type { UsersRepository, UpsertUserData } from '$domain/user.js';
import type { User } from '$domain/user.js';

const mockRepo: UsersRepository = {
    findById: vi.fn(),
    findByAuth0Sub: vi.fn(),
    upsert: vi.fn(),
};

const service = new UsersService(mockRepo);

beforeEach(() => vi.clearAllMocks());

const user: User = {
    id: '507f1f77bcf86cd799439011',
    auth0Sub: 'auth0|abc123',
    email: 'test@example.com',
    timezone: 'Africa/Johannesburg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('getById', () => {
    it('delegates to repo.findById with the given id and returns the user', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(user);

        expect(await service.getById(user.id)).toEqual(user);
        expect(mockRepo.findById).toHaveBeenCalledExactlyOnceWith(user.id);
    });

    it('returns null when the user does not exist', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(null);

        expect(await service.getById('507f1f77bcf86cd799439011')).toBeNull();
    });
});

describe('getByAuth0Sub', () => {
    it('delegates to repo.findByAuth0Sub and returns the user', async () => {
        vi.mocked(mockRepo.findByAuth0Sub).mockResolvedValue(user);

        expect(await service.getByAuth0Sub(user.auth0Sub)).toEqual(user);
        expect(mockRepo.findByAuth0Sub).toHaveBeenCalledExactlyOnceWith(user.auth0Sub);
    });

    it('returns null when no user has that auth0Sub', async () => {
        vi.mocked(mockRepo.findByAuth0Sub).mockResolvedValue(null);

        expect(await service.getByAuth0Sub('auth0|unknown')).toBeNull();
    });
});

describe('upsert', () => {
    it('delegates to repo.upsert with the given data and returns the user', async () => {
        const data: UpsertUserData = {
            auth0Sub: 'auth0|abc123',
            email: 'test@example.com',
            timezone: 'Africa/Johannesburg',
        };
        vi.mocked(mockRepo.upsert).mockResolvedValue(user);

        expect(await service.upsert(data)).toEqual(user);
        expect(mockRepo.upsert).toHaveBeenCalledExactlyOnceWith(data);
    });
});
