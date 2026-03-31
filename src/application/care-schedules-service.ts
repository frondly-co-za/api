import {
    CareSchedule,
    CareSchedulesRepository,
    CreateCareScheduleData,
    UpdateCareScheduleData
} from '$domain/care-schedule.js';
import { computeNextDue } from './next-due.js';

export class CareSchedulesService {
    constructor(private readonly careSchedules: CareSchedulesRepository) {}

    getByPlantId(plantId: string): Promise<CareSchedule[]> {
        return this.careSchedules.findByPlantId(plantId);
    }

    getDue(userId: string, asOf: string): Promise<CareSchedule[]> {
        return this.careSchedules.findDue(userId, asOf);
    }

    getById(plantId: string, id: string): Promise<CareSchedule | null> {
        return this.careSchedules.findById(plantId, id);
    }

    create(input: Omit<CreateCareScheduleData, 'nextDue'>): Promise<CareSchedule> {
        const nextDue = computeNextDue(new Date(), input.dayOfWeek, input.dayOfMonth, input.months);
        return this.careSchedules.create({ ...input, nextDue: nextDue.toISOString() });
    }

    async update(id: string, data: UpdateCareScheduleData): Promise<CareSchedule | null> {
        const updated = await this.careSchedules.update(id, data);
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
            return (
                (await this.careSchedules.update(id, { nextDue: nextDue.toISOString() })) ?? updated
            );
        }

        return updated;
    }

    delete(id: string): Promise<boolean> {
        return this.careSchedules.delete(id);
    }
}
