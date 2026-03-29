import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlantsService } from '$application/plants-service.js';
import type { PlantsRepository } from '$domain/plant.js';
import type { Plant } from '$domain/plant.js';

const mockRepo: PlantsRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
};

const service = new PlantsService(mockRepo);

beforeEach(() => vi.clearAllMocks());

describe('getAll', () => {
    it('delegates to repo.findAll and returns the result', async () => {
        const plants: Plant[] = [{ id: '507f1f77bcf86cd799439011', name: 'Cactus' }];
        vi.mocked(mockRepo.findAll).mockResolvedValue(plants);

        expect(await service.getAll()).toEqual(plants);
        expect(mockRepo.findAll).toHaveBeenCalledOnce();
    });
});

describe('getById', () => {
    it('delegates to repo.findById with the given id and returns the plant', async () => {
        const plant: Plant = { id: '507f1f77bcf86cd799439011', name: 'Cactus' };
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
    it('delegates to repo.create with the given name and returns the new plant', async () => {
        const plant: Plant = { id: '507f1f77bcf86cd799439011', name: 'Cactus' };
        vi.mocked(mockRepo.create).mockResolvedValue(plant);

        expect(await service.create('Cactus')).toEqual(plant);
        expect(mockRepo.create).toHaveBeenCalledExactlyOnceWith('Cactus');
    });
});
