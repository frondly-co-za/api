import { CareLog, CreateCareLogData, CareLogsRepository } from '$domain/care-log.js';
import { CareSchedulesRepository } from '$domain/care-schedule.js';
import { computeNextDue } from './next-due.js';

export class CareLogsService {
    constructor(
        private readonly careLogs: CareLogsRepository,
        private readonly careSchedules: CareSchedulesRepository
    ) {}

    getByPlantId(userId: string, plantId: string): Promise<CareLog[]> {
        return this.careLogs.findByPlantId(userId, plantId);
    }

    getById(userId: string, plantId: string, id: string): Promise<CareLog | null> {
        return this.careLogs.findById(userId, plantId, id);
    }

    async create(data: CreateCareLogData): Promise<CareLog | null> {
        if (data.scheduleId) {
            const schedule = await this.careSchedules.findById(
                data.userId,
                data.plantId,
                data.scheduleId
            );
            if (!schedule) return null;
            if (schedule.careTypeId !== data.careTypeId) return null;

            const log = await this.careLogs.create(data);

            const nextDue = computeNextDue(
                new Date(data.performedAt),
                schedule.dayOfWeek,
                schedule.dayOfMonth,
                schedule.months
            );
            await this.careSchedules.update(data.userId, data.scheduleId, {
                nextDue: nextDue.toISOString()
            });

            return log;
        }

        return this.careLogs.create(data);
    }

    delete(userId: string, plantId: string, id: string): Promise<boolean> {
        return this.careLogs.delete(userId, plantId, id);
    }
}
