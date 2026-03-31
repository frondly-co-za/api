import { Static, Type } from 'typebox';

export const CareLogSchema = Type.Object({
    id: Type.String(),
    userId: Type.String(),
    plantId: Type.String(),
    scheduleId: Type.Union([Type.String(), Type.Null()]), // null if logged ad-hoc, outside a schedule
    careTypeId: Type.String(),
    selectedOption: Type.Union([Type.String(), Type.Null()]),
    notes: Type.Union([Type.String(), Type.Null()]),
    performedAt: Type.String({ format: 'date-time' }), // when care actually happened, not when logged
    createdAt: Type.String({ format: 'date-time' })
});

export type CareLog = Static<typeof CareLogSchema>;

export interface CreateCareLogData {
    userId: string;
    plantId: string;
    scheduleId: string | null;
    careTypeId?: string; // optional when scheduleId is set — resolved from the schedule by the service
    selectedOption: string | null;
    notes: string | null;
    performedAt: string;
}

// The repository always receives a fully resolved careTypeId — the service is responsible
// for resolving it from the schedule when it is omitted in CreateCareLogData.
export type ResolvedCreateCareLogData = Omit<CreateCareLogData, 'careTypeId'> & {
    careTypeId: string;
};

export interface CareLogsRepository {
    findByPlantId(userId: string, plantId: string, scheduleId?: string): Promise<CareLog[]>;
    findById(userId: string, plantId: string, id: string): Promise<CareLog | null>;
    create(data: ResolvedCreateCareLogData): Promise<CareLog>;
    delete(userId: string, plantId: string, id: string): Promise<boolean>;
}
