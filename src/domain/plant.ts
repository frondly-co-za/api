import { Static, Type } from 'typebox';

export const PlantSchema = Type.Object({
    id: Type.String(),
    name: Type.String()
});

export type Plant = Static<typeof PlantSchema>;

export interface PlantsRepository {
    findAll(): Promise<Plant[]>;
    findById(id: string): Promise<Plant | null>;
    create(name: string): Promise<Plant>;
}
