import { CareLog, CreateCareLogData, CareLogsRepository } from '$domain/care-log.js';
import { CareSchedulesRepository } from '$domain/care-schedule.js';
import { computeNextDue } from './next-due.js';
import type { FastifyBaseLogger } from 'fastify';

export class CareLogsService {
    constructor(
        private readonly careLogs: CareLogsRepository,
        private readonly careSchedules: CareSchedulesRepository,
        private readonly log: FastifyBaseLogger
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
            if (!schedule) {
                this.log.debug({ scheduleId: data.scheduleId }, 'care log rejected: schedule not found');
                return null;
            }
            if (schedule.careTypeId !== data.careTypeId) {
                this.log.debug(
                    { scheduleId: data.scheduleId, expected: schedule.careTypeId, got: data.careTypeId },
                    'care log rejected: care type mismatch'
                );
                return null;
            }

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
            this.log.debug(
                { scheduleId: data.scheduleId, nextDue: nextDue.toISOString() },
                'schedule nextDue advanced after care log'
            );

            return log;
        }

        return this.careLogs.create(data);
    }

    delete(userId: string, plantId: string, id: string): Promise<boolean> {
        return this.careLogs.delete(userId, plantId, id);
    }
}
