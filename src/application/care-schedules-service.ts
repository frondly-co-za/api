import {
    CareSchedule,
    CareSchedulesRepository,
    UpdateCareScheduleData
} from '$domain/care-schedule.js';
import { computeNextDue } from './next-due.js';

export interface CreateCareScheduleInput {
    userId: string;
    plantId: string;
    careTypeId: string;
    selectedOption: string | null;
    notes: string | null;
    dayOfWeek: number[];
    dayOfMonth: number[];
    months: number[];
}

export class CareSchedulesService {
    constructor(private readonly careSchedules: CareSchedulesRepository) {}

    getByPlantId(plantId: string): Promise<CareSchedule[]> {
        return this.careSchedules.findByPlantId(plantId);
    }

    getDue(userId: string, asOf: string): Promise<CareSchedule[]> {
        return this.careSchedules.findDue(userId, asOf);
    }

    getById(id: string): Promise<CareSchedule | null> {
        return this.careSchedules.findById(id);
    }

    create(input: CreateCareScheduleInput): Promise<CareSchedule> {
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
            await this.careSchedules.updateNextDue(id, nextDue.toISOString());
            return { ...updated, nextDue: nextDue.toISOString() };
        }

        return updated;
    }

    setActive(id: string, isActive: boolean): Promise<void> {
        return this.careSchedules.setActive(id, isActive);
    }

    delete(id: string): Promise<boolean> {
        return this.careSchedules.delete(id);
    }
}
