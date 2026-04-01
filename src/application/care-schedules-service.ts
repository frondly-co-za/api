import {
    CareSchedule,
    CareSchedulesRepository,
    CreateCareScheduleData,
    UpdateCareScheduleData
} from '$domain/care-schedule.js';
import { computeNextDue } from './next-due.js';
import type { FastifyBaseLogger } from 'fastify';

export class CareSchedulesService {
    constructor(
        private readonly careSchedules: CareSchedulesRepository,
        private readonly log: FastifyBaseLogger
    ) {}

    getByPlantId(userId: string, plantId: string): Promise<CareSchedule[]> {
        return this.careSchedules.findByPlantId(userId, plantId);
    }

    getDue(userId: string, asOf: string): Promise<CareSchedule[]> {
        return this.careSchedules.findDue(userId, asOf);
    }

    getById(userId: string, plantId: string, id: string): Promise<CareSchedule | null> {
        return this.careSchedules.findById(userId, plantId, id);
    }

    create(input: Omit<CreateCareScheduleData, 'nextDue'>): Promise<CareSchedule> {
        const nextDue = computeNextDue(new Date(), input.dayOfWeek, input.dayOfMonth, input.months);
        return this.careSchedules.create({ ...input, nextDue: nextDue.toISOString() });
    }

    async update(
        userId: string,
        id: string,
        data: UpdateCareScheduleData
    ): Promise<CareSchedule | null> {
        const updated = await this.careSchedules.update(userId, id, data);
        if (!updated) return null;

        const recurrenceChanged =
            data.dayOfWeek !== undefined ||
            data.dayOfMonth !== undefined ||
            data.months !== undefined;

        if (recurrenceChanged) {
            const nextDue = computeNextDue(
                new Date(),
                updated.dayOfWeek,
                updated.dayOfMonth,
                updated.months
            );
            this.log.debug(
                { scheduleId: id, nextDue: nextDue.toISOString() },
                'recurrence changed, recomputed nextDue'
            );
            return (
                (await this.careSchedules.update(userId, id, { nextDue: nextDue.toISOString() })) ??
                updated
            );
        }

        return updated;
    }

    delete(userId: string, id: string): Promise<boolean> {
        return this.careSchedules.delete(userId, id);
    }
}
