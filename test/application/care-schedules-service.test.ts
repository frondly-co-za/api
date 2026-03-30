import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CareSchedulesService } from '$application/care-schedules-service.js';
import type { CareSchedulesRepository, CareSchedule } from '$domain/care-schedule.js';

vi.mock('$application/next-due.js', () => ({
    computeNextDue: vi.fn(() => new Date('2026-04-01T00:00:00.000Z')),
}));

import { computeNextDue } from '$application/next-due.js';

const mockRepo: CareSchedulesRepository = {
    findByPlantId: vi.fn(),
    findDue: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateNextDue: vi.fn(),
    setActive: vi.fn(),
    delete: vi.fn(),
};

const service = new CareSchedulesService(mockRepo);

beforeEach(() => vi.clearAllMocks());

const userId = '507f1f77bcf86cd799439012';
const plantId = '507f1f77bcf86cd799439013';
const careTypeId = '507f1f77bcf86cd799439014';

const schedule: CareSchedule = {
    id: '507f1f77bcf86cd799439011',
    userId,
    plantId,
    careTypeId,
    selectedOption: null,
    notes: null,
    dayOfWeek: [1, 3],
    dayOfMonth: [],
    months: [],
    nextDue: '2026-04-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('getByPlantId', () => {
    it('delegates to repo.findByPlantId', async () => {
        vi.mocked(mockRepo.findByPlantId).mockResolvedValue([schedule]);

        expect(await service.getByPlantId(plantId)).toEqual([schedule]);
        expect(mockRepo.findByPlantId).toHaveBeenCalledExactlyOnceWith(plantId);
    });
});

describe('getById', () => {
    it('returns the schedule when found', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(schedule);

        expect(await service.getById(schedule.id)).toEqual(schedule);
    });

    it('returns null when not found', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(null);

        expect(await service.getById(schedule.id)).toBeNull();
    });
});

describe('create', () => {
    it('computes nextDue via croner and passes it to repo.create', async () => {
        vi.mocked(mockRepo.create).mockResolvedValue(schedule);

        await service.create({
            userId,
            plantId,
            careTypeId,
            selectedOption: null,
            notes: null,
            dayOfWeek: [1, 3],
            dayOfMonth: [],
            months: [],
        });

        expect(computeNextDue).toHaveBeenCalledOnce();
        expect(mockRepo.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ nextDue: '2026-04-01T00:00:00.000Z' })
        );
    });
});

describe('update', () => {
    it('returns null when the schedule does not exist', async () => {
        vi.mocked(mockRepo.update).mockResolvedValue(null);

        expect(await service.update(schedule.id, { notes: 'updated' })).toBeNull();
        expect(mockRepo.updateNextDue).not.toHaveBeenCalled();
    });

    it('does not recompute nextDue when recurrence fields are unchanged', async () => {
        vi.mocked(mockRepo.update).mockResolvedValue(schedule);

        const result = await service.update(schedule.id, { notes: 'updated' });

        expect(computeNextDue).not.toHaveBeenCalled();
        expect(mockRepo.updateNextDue).not.toHaveBeenCalled();
        expect(result).toEqual(schedule);
    });

    it('recomputes and persists nextDue when recurrence fields change', async () => {
        vi.mocked(mockRepo.update).mockResolvedValue(schedule);
        vi.mocked(mockRepo.updateNextDue).mockResolvedValue();

        const result = await service.update(schedule.id, { dayOfWeek: [5] });

        expect(computeNextDue).toHaveBeenCalledOnce();
        expect(mockRepo.updateNextDue).toHaveBeenCalledExactlyOnceWith(
            schedule.id,
            '2026-04-01T00:00:00.000Z'
        );
        expect(result).toEqual({ ...schedule, nextDue: '2026-04-01T00:00:00.000Z' });
    });
});

describe('setActive', () => {
    it('delegates to repo.setActive', async () => {
        vi.mocked(mockRepo.setActive).mockResolvedValue();

        await service.setActive(schedule.id, false);

        expect(mockRepo.setActive).toHaveBeenCalledExactlyOnceWith(schedule.id, false);
    });
});

describe('delete', () => {
    it('returns true when deleted', async () => {
        vi.mocked(mockRepo.delete).mockResolvedValue(true);

        expect(await service.delete(schedule.id)).toBe(true);
    });

    it('returns false when not found', async () => {
        vi.mocked(mockRepo.delete).mockResolvedValue(false);

        expect(await service.delete(schedule.id)).toBe(false);
    });
});
