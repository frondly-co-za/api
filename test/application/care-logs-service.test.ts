import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CareLogsService } from '$application/care-logs-service.js';
import type { CareLogsRepository, CareLog } from '$domain/care-log.js';
import type { CareSchedulesRepository, CareSchedule } from '$domain/care-schedule.js';

vi.mock('$application/next-due.js', () => ({
    computeNextDue: vi.fn(() => new Date('2026-04-07T00:00:00.000Z')),
}));

import { computeNextDue } from '$application/next-due.js';

const mockLogsRepo: CareLogsRepository = {
    findByPlantId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
};

const mockSchedulesRepo: CareSchedulesRepository = {
    findByPlantId: vi.fn(),
    findDue: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const service = new CareLogsService(mockLogsRepo, mockSchedulesRepo);

beforeEach(() => vi.clearAllMocks());

const userId = '507f1f77bcf86cd799439012';
const plantId = '507f1f77bcf86cd799439013';
const careTypeId = '507f1f77bcf86cd799439014';
const scheduleId = '507f1f77bcf86cd799439015';

const schedule: CareSchedule = {
    id: scheduleId,
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

const log: CareLog = {
    id: '507f1f77bcf86cd799439011',
    userId,
    plantId,
    scheduleId: null,
    careTypeId,
    selectedOption: null,
    notes: null,
    performedAt: '2026-03-31T10:00:00.000Z',
    createdAt: '2026-03-31T10:00:00.000Z',
};

describe('getByPlantId', () => {
    it('delegates to repo.findByPlantId without scheduleId', async () => {
        vi.mocked(mockLogsRepo.findByPlantId).mockResolvedValue([log]);

        expect(await service.getByPlantId(plantId)).toEqual([log]);
        expect(mockLogsRepo.findByPlantId).toHaveBeenCalledExactlyOnceWith(plantId, undefined);
    });

    it('delegates to repo.findByPlantId with scheduleId', async () => {
        vi.mocked(mockLogsRepo.findByPlantId).mockResolvedValue([log]);

        await service.getByPlantId(plantId, scheduleId);

        expect(mockLogsRepo.findByPlantId).toHaveBeenCalledExactlyOnceWith(plantId, scheduleId);
    });
});

describe('getById', () => {
    it('delegates to repo.findById', async () => {
        vi.mocked(mockLogsRepo.findById).mockResolvedValue(log);

        expect(await service.getById(plantId, log.id)).toEqual(log);
        expect(mockLogsRepo.findById).toHaveBeenCalledExactlyOnceWith(plantId, log.id);
    });
});

describe('create (ad-hoc)', () => {
    it('creates the log directly without touching the schedule', async () => {
        vi.mocked(mockLogsRepo.create).mockResolvedValue(log);

        const result = await service.create({
            userId,
            plantId,
            scheduleId: null,
            careTypeId,
            selectedOption: null,
            notes: null,
            performedAt: log.performedAt,
        });

        expect(result).toEqual(log);
        expect(mockSchedulesRepo.findById).not.toHaveBeenCalled();
        expect(mockSchedulesRepo.update).not.toHaveBeenCalled();
        expect(mockLogsRepo.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ careTypeId, scheduleId: null })
        );
    });
});

describe('create (scheduled)', () => {
    it('resolves careTypeId from schedule when not provided and updates nextDue', async () => {
        const scheduledLog = { ...log, scheduleId };
        vi.mocked(mockSchedulesRepo.findById).mockResolvedValue(schedule);
        vi.mocked(mockLogsRepo.create).mockResolvedValue(scheduledLog);
        vi.mocked(mockSchedulesRepo.update).mockResolvedValue(schedule);

        const result = await service.create({
            userId,
            plantId,
            scheduleId,
            // careTypeId omitted — should be resolved from schedule
            selectedOption: null,
            notes: null,
            performedAt: log.performedAt,
        });

        expect(result).toEqual(scheduledLog);
        expect(mockLogsRepo.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ careTypeId, scheduleId })
        );
        expect(computeNextDue).toHaveBeenCalledOnce();
        expect(mockSchedulesRepo.update).toHaveBeenCalledExactlyOnceWith(scheduleId, {
            nextDue: '2026-04-07T00:00:00.000Z'
        });
    });

    it('uses the provided careTypeId even when scheduleId is set', async () => {
        const overriddenTypeId = '507f1f77bcf86cd799439099';
        vi.mocked(mockSchedulesRepo.findById).mockResolvedValue(schedule);
        vi.mocked(mockLogsRepo.create).mockResolvedValue(log);
        vi.mocked(mockSchedulesRepo.update).mockResolvedValue(schedule);

        await service.create({
            userId,
            plantId,
            scheduleId,
            careTypeId: overriddenTypeId,
            selectedOption: null,
            notes: null,
            performedAt: log.performedAt,
        });

        expect(mockLogsRepo.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ careTypeId: overriddenTypeId })
        );
    });

    it('returns null when the schedule does not exist', async () => {
        vi.mocked(mockSchedulesRepo.findById).mockResolvedValue(null);

        const result = await service.create({
            userId,
            plantId,
            scheduleId,
            selectedOption: null,
            notes: null,
            performedAt: log.performedAt,
        });

        expect(result).toBeNull();
        expect(mockLogsRepo.create).not.toHaveBeenCalled();
    });
});

describe('delete', () => {
    it('returns true when deleted', async () => {
        vi.mocked(mockLogsRepo.delete).mockResolvedValue(true);

        expect(await service.delete(plantId, log.id)).toBe(true);
        expect(mockLogsRepo.delete).toHaveBeenCalledExactlyOnceWith(plantId, log.id);
    });

    it('returns false when not found', async () => {
        vi.mocked(mockLogsRepo.delete).mockResolvedValue(false);

        expect(await service.delete(plantId, log.id)).toBe(false);
    });
});
