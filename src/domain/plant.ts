import { Static, Type } from 'typebox';
import { CareScheduleSchema } from './care-schedule.js';
import { CareLogSchema } from './care-log.js';

export const PlantSchema = Type.Object({
    id: Type.String(),
    userId: Type.String(),
    name: Type.String({ maxLength: 256 }),
    description: Type.Union([Type.String({ maxLength: 256 }), Type.Null()]),
    coverPhotoId: Type.Union([Type.String(), Type.Null()]),
    acquiredAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    notes: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
    schedules: Type.Optional(Type.Array(CareScheduleSchema)),
    recentLogs: Type.Optional(Type.Array(CareLogSchema)),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type Plant = Static<typeof PlantSchema>;

export const CreatePlantDataSchema = Type.Object({
    id: Type.Optional(Type.String()),
    userId: Type.String(),
    name: Type.String({ maxLength: 256 }),
    description: Type.Union([Type.String({ maxLength: 256 }), Type.Null()]),
    acquiredAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    notes: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()])
});
export type CreatePlantData = Static<typeof CreatePlantDataSchema>;

export const UpdatePlantDataSchema = Type.Object({
    name: Type.Optional(Type.String({ maxLength: 256 })),
    description: Type.Optional(Type.Union([Type.String({ maxLength: 256 }), Type.Null()])),
    coverPhotoId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    acquiredAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String({ maxLength: 1000 }), Type.Null()])),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
});
export type UpdatePlantData = Static<typeof UpdatePlantDataSchema>;

export interface PlantsRepository {
    findAll(userId: string, include?: string[]): Promise<Plant[]>;
    findById(userId: string, id: string): Promise<Plant | null>;
    create(data: CreatePlantData): Promise<Plant>;
    update(userId: string, id: string, data: UpdatePlantData): Promise<Plant | null>;
    clearCoverPhoto(userId: string, plantId: string, photoId: string): Promise<void>;
    delete(userId: string, id: string): Promise<boolean>;
}
