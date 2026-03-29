import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import usersRoute from '$infrastructure/http/routes/users.js';
import type { User } from '$domain/user.js';

/**
 * Build a minimal Fastify app with the users route and a mocked usersService.
 * No DB or real plugins are loaded — we decorate directly before registering routes.
 */
function buildApp() {
    const app = Fastify({ logger: false });

    const mockUsersService = {
        getById: vi.fn<(id: string) => Promise<User | null>>(),
        getByAuth0Sub: vi.fn<(auth0Sub: string) => Promise<User | null>>(),
        upsert: vi.fn<(data: object) => Promise<User>>(),
    };

    // Decorate before registering routes so the plugin can access it
    app.decorate('usersService', mockUsersService as never);
    app.register(usersRoute, { prefix: '/users' });

    return { app, mockUsersService };
}

const user: User = {
    id: '507f1f77bcf86cd799439011',
    auth0Sub: 'auth0|abc123',
    email: 'test@example.com',
    timezone: 'Africa/Johannesburg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /users/:id', () => {
    const { app, mockUsersService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the user when found', async () => {
        mockUsersService.getById.mockResolvedValue(user);

        const res = await app.inject({ method: 'GET', url: '/users/507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(user);
    });

    it('returns 404 when no user has that id', async () => {
        mockUsersService.getById.mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: '/users/507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when id is not a valid ObjectId', async () => {
        const res = await app.inject({ method: 'GET', url: '/users/not-a-valid-id' });

        expect(res.statusCode).toBe(400);
        expect(mockUsersService.getById).not.toHaveBeenCalled();
    });
});

describe('POST /users', () => {
    const { app, mockUsersService } = buildApp();
    afterAll(() => app.close());
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the upserted user', async () => {
        mockUsersService.upsert.mockResolvedValue(user);

        const res = await app.inject({
            method: 'POST',
            url: '/users',
            payload: { auth0Sub: 'auth0|abc123', email: 'test@example.com', timezone: 'Africa/Johannesburg' },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(user);
    });

    it('returns 400 when the request body is missing auth0Sub', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/users',
            payload: { email: 'test@example.com', timezone: 'Africa/Johannesburg' },
        });

        expect(res.statusCode).toBe(400);
        expect(mockUsersService.upsert).not.toHaveBeenCalled();
    });
});
