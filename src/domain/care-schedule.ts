import { Static, Type } from 'typebox';

export const CareScheduleSchema = Type.Object({
    id: Type.String(),
    userId: Type.String(),
    plantId: Type.String(),
    careTypeId: Type.String(),
    selectedOption: Type.Union([Type.String(), Type.Null()]),
    notes: Type.Union([Type.String(), Type.Null()]),

    // Recurrence — cron-subset fields.
    // Empty array means "match any" for that dimension.
    // e.g. dayOfWeek: [1, 3], dayOfMonth: [], months: [3, 4, 5]
    // = "every Monday and Wednesday in March–May"
    dayOfWeek: Type.Array(Type.Integer({ minimum: 0, maximum: 6 })), // 0 = Sunday
    dayOfMonth: Type.Array(Type.Integer({ minimum: 1, maximum: 31 })),
    months: Type.Array(Type.Integer({ minimum: 1, maximum: 12 })),

    // Computed and stored to allow simple range queries: { nextDue: { $lte: now } }
    // Must be recalculated whenever a careLog is recorded against this schedule.
    nextDue: Type.String({ format: 'date-time' }),

    isActive: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type CareSchedule = Static<typeof CareScheduleSchema>;

export const CreateCareScheduleDataSchema = Type.Object({
    userId: Type.String(),
    plantId: Type.String(),
    careTypeId: Type.String(),
    selectedOption: Type.Union([Type.String(), Type.Null()]),
    notes: Type.Union([Type.String(), Type.Null()]),
    // Empty array means "match any" for that dimension
    dayOfWeek: Type.Array(Type.Integer({ minimum: 0, maximum: 6 })),
    dayOfMonth: Type.Array(Type.Integer({ minimum: 1, maximum: 31 })),
    months: Type.Array(Type.Integer({ minimum: 1, maximum: 12 })),
    nextDue: Type.String({ format: 'date-time' }) // computed by service; not exposed in route body
});
export type CreateCareScheduleData = Static<typeof CreateCareScheduleDataSchema>;

export const UpdateCareScheduleDataSchema = Type.Object({
    careTypeId: Type.Optional(Type.String()),
    selectedOption: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    dayOfWeek: Type.Optional(Type.Array(Type.Integer({ minimum: 0, maximum: 6 }))),
    dayOfMonth: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 31 }))),
    months: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 12 }))),
    isActive: Type.Optional(Type.Boolean()),
    nextDue: Type.Optional(Type.String({ format: 'date-time' })) // computed by service; not exposed in route body
});
export type UpdateCareScheduleData = Static<typeof UpdateCareScheduleDataSchema>;

export interface CareSchedulesRepository {
    findByPlantId(userId: string, plantId: string): Promise<CareSchedule[]>;
    findDue(userId: string, asOf: string): Promise<CareSchedule[]>; // nextDue <= asOf
    findById(userId: string, plantId: string, id: string): Promise<CareSchedule | null>;
    create(data: CreateCareScheduleData): Promise<CareSchedule>;
    update(userId: string, id: string, data: UpdateCareScheduleData): Promise<CareSchedule | null>;
    delete(userId: string, id: string): Promise<boolean>;
}
