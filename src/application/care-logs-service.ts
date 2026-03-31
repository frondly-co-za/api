import { CareLog, CreateCareLogData, CareLogsRepository } from '$domain/care-log.js';
import { CareSchedulesRepository } from '$domain/care-schedule.js';
import { computeNextDue } from './next-due.js';

export class CareLogsService {
    constructor(
        private readonly careLogs: CareLogsRepository,
        private readonly careSchedules: CareSchedulesRepository
    ) {}

    getByPlantId(userId: string, plantId: string, scheduleId?: string): Promise<CareLog[]> {
        return this.careLogs.findByPlantId(userId, plantId, scheduleId);
    }

    getById(userId: string, plantId: string, id: string): Promise<CareLog | null> {
        return this.careLogs.findById(userId, plantId, id);
    }

    async create(data: CreateCareLogData): Promise<CareLog | null> {
        let { careTypeId } = data;

        if (data.scheduleId) {
            const schedule = await this.careSchedules.findById(
                data.userId,
                data.plantId,
                data.scheduleId
            );
            if (!schedule) return null;
            careTypeId ??= schedule.careTypeId;

            const log = await this.careLogs.create({ ...data, careTypeId });

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

        if (!careTypeId) throw new Error('careTypeId is required for ad-hoc care logs');

        return this.careLogs.create({ ...data, careTypeId });
    }

    delete(userId: string, plantId: string, id: string): Promise<boolean> {
        return this.careLogs.delete(userId, plantId, id);
    }
}
