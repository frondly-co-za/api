import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlantsService } from '$application/plants-service.js';
import type { PlantsRepository, CreatePlantData } from '$domain/plant.js';
import type { Plant } from '$domain/plant.js';

const mockRepo: PlantsRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
};

const service = new PlantsService(mockRepo);

beforeEach(() => vi.clearAllMocks());

const userId = '507f1f77bcf86cd799439012';

const plant: Plant = {
    id: '507f1f77bcf86cd799439011',
    userId,
    name: 'Cactus',
    description: null,
    photoUrl: null,
    acquiredAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('getAll', () => {
    it('delegates to repo.findAll with userId and returns the result', async () => {
        vi.mocked(mockRepo.findAll).mockResolvedValue([plant]);

        expect(await service.getAll(userId)).toEqual([plant]);
        expect(mockRepo.findAll).toHaveBeenCalledExactlyOnceWith(userId);
    });
});

describe('getById', () => {
    it('delegates to repo.findById with the given id and returns the plant', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(plant);

        expect(await service.getById(plant.id)).toEqual(plant);
        expect(mockRepo.findById).toHaveBeenCalledExactlyOnceWith(plant.id);
    });

    it('returns null when the plant does not exist', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(null);

        expect(await service.getById('507f1f77bcf86cd799439011')).toBeNull();
    });
});

describe('create', () => {
    it('delegates to repo.create with the given data and returns the new plant', async () => {
        const data: CreatePlantData = {
            userId,
            name: 'Cactus',
            description: null,
            photoUrl: null,
            acquiredAt: null,
            notes: null,
        };
        vi.mocked(mockRepo.create).mockResolvedValue(plant);

        expect(await service.create(data)).toEqual(plant);
        expect(mockRepo.create).toHaveBeenCalledExactlyOnceWith(data);
    });
});
