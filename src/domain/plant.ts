import { Static, Type } from 'typebox';

export const PlantSchema = Type.Object({
    id: Type.String(),
    userId: Type.String(),
    name: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
    photoUrl: Type.Union([Type.String(), Type.Null()]),
    acquiredAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    notes: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type Plant = Static<typeof PlantSchema>;

export interface CreatePlantData {
    userId: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    acquiredAt: string | null;
    notes: string | null;
}

export interface UpdatePlantData {
    name?: string;
    description?: string | null;
    photoUrl?: string | null;
    acquiredAt?: string | null;
    notes?: string | null;
}

export interface PlantsRepository {
    findAll(userId: string): Promise<Plant[]>;
    findById(userId: string, id: string): Promise<Plant | null>;
    create(data: CreatePlantData): Promise<Plant>;
    update(userId: string, id: string, data: UpdatePlantData): Promise<Plant | null>;
    delete(userId: string, id: string): Promise<boolean>;
}
