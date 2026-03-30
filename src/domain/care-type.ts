import { Static, Type } from 'typebox';

export const CareTypeSchema = Type.Object({
    id: Type.String(),
    userId: Type.Union([Type.String(), Type.Null()]), // null = system default
    name: Type.String(),
    options: Type.Array(Type.String()),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type CareType = Static<typeof CareTypeSchema>;

export interface CreateCareTypeData {
    userId: string;
    name: string;
    options: string[];
}

export interface UpdateCareTypeData {
    name?: string;
    options?: string[];
}

export interface CareTypesRepository {
    findAll(userId: string): Promise<CareType[]>; // returns system defaults + user's own
    findById(id: string): Promise<CareType | null>;
    create(data: CreateCareTypeData): Promise<CareType>;
    update(id: string, data: UpdateCareTypeData): Promise<CareType | null>;
    delete(id: string): Promise<boolean>;
}
