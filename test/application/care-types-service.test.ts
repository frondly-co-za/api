import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CareTypesService } from '$application/care-types-service.js';
import type { CareTypesRepository, CareType } from '$domain/care-type.js';

const mockRepo: CareTypesRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const service = new CareTypesService(mockRepo);

beforeEach(() => vi.clearAllMocks());

const userId = '507f1f77bcf86cd799439012';

const careType: CareType = {
    id: '507f1f77bcf86cd799439011',
    userId,
    name: 'Watering',
    options: ['light', 'deep'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('getAll', () => {
    it('delegates to repo.findAll with userId', async () => {
        vi.mocked(mockRepo.findAll).mockResolvedValue([careType]);

        expect(await service.getAll(userId)).toEqual([careType]);
        expect(mockRepo.findAll).toHaveBeenCalledExactlyOnceWith(userId);
    });
});

describe('getById', () => {
    it('returns the care type when found', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(careType);

        expect(await service.getById(careType.id)).toEqual(careType);
        expect(mockRepo.findById).toHaveBeenCalledExactlyOnceWith(careType.id);
    });

    it('returns null when not found', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(null);

        expect(await service.getById(careType.id)).toBeNull();
    });
});

describe('create', () => {
    it('delegates to repo.create and returns the new care type', async () => {
        vi.mocked(mockRepo.create).mockResolvedValue(careType);

        const result = await service.create({ userId, name: 'Watering', options: ['light', 'deep'] });

        expect(result).toEqual(careType);
        expect(mockRepo.create).toHaveBeenCalledExactlyOnceWith({
            userId,
            name: 'Watering',
            options: ['light', 'deep'],
        });
    });
});

describe('update', () => {
    it('delegates to repo.update and returns the updated care type', async () => {
        const updated = { ...careType, name: 'Fertilising' };
        vi.mocked(mockRepo.update).mockResolvedValue(updated);

        expect(await service.update(careType.id, { name: 'Fertilising' })).toEqual(updated);
        expect(mockRepo.update).toHaveBeenCalledExactlyOnceWith(careType.id, { name: 'Fertilising' });
    });

    it('returns null when not found', async () => {
        vi.mocked(mockRepo.update).mockResolvedValue(null);

        expect(await service.update(careType.id, { name: 'Fertilising' })).toBeNull();
    });
});

describe('delete', () => {
    it('returns true when deleted', async () => {
        vi.mocked(mockRepo.delete).mockResolvedValue(true);

        expect(await service.delete(careType.id)).toBe(true);
        expect(mockRepo.delete).toHaveBeenCalledExactlyOnceWith(careType.id);
    });

    it('returns false when not found', async () => {
        vi.mocked(mockRepo.delete).mockResolvedValue(false);

        expect(await service.delete(careType.id)).toBe(false);
    });
});
