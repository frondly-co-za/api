import { Static, Type } from 'typebox';

export const CareLogSchema = Type.Object({
    id: Type.String(),
    userId: Type.String(),
    plantId: Type.String(),
    scheduleId: Type.Union([Type.String(), Type.Null()]), // null if logged ad-hoc, outside a schedule
    careTypeId: Type.String(),
    selectedOption: Type.Union([Type.String({ maxLength: 256 }), Type.Null()]),
    notes: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
    performedAt: Type.String({ format: 'date-time' }), // when care actually happened, not when logged
    createdAt: Type.String({ format: 'date-time' })
});

export type CareLog = Static<typeof CareLogSchema>;

export const CreateCareLogDataSchema = Type.Object({
    id: Type.Optional(Type.String()),
    userId: Type.String(),
    plantId: Type.String(),
    scheduleId: Type.Union([Type.String(), Type.Null()]),
    careTypeId: Type.String(),
    selectedOption: Type.Union([Type.String({ maxLength: 256 }), Type.Null()]),
    notes: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
    performedAt: Type.String({ format: 'date-time' })
});
export type CreateCareLogData = Static<typeof CreateCareLogDataSchema>;

export interface CareLogsRepository {
    findByPlantId(userId: string, plantId: string): Promise<CareLog[]>;
    findById(userId: string, plantId: string, id: string): Promise<CareLog | null>;
    create(data: CreateCareLogData): Promise<CareLog>;
    delete(userId: string, plantId: string, id: string): Promise<boolean>;
}
