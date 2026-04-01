import { Static, Type } from 'typebox';

export const CareTypeSchema = Type.Object({
    id: Type.String(),
    userId: Type.Union([Type.String(), Type.Null()]), // null = system default
    name: Type.String({ maxLength: 256 }),
    options: Type.Array(Type.String({ maxLength: 256 })),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type CareType = Static<typeof CareTypeSchema>;

export const CreateCareTypeDataSchema = Type.Object({
    userId: Type.String(),
    name: Type.String({ maxLength: 256 }),
    options: Type.Array(Type.String({ maxLength: 256 }))
});
export type CreateCareTypeData = Static<typeof CreateCareTypeDataSchema>;

export const UpdateCareTypeDataSchema = Type.Object({
    name: Type.Optional(Type.String({ maxLength: 256 })),
    options: Type.Optional(Type.Array(Type.String({ maxLength: 256 })))
});
export type UpdateCareTypeData = Static<typeof UpdateCareTypeDataSchema>;

export interface CareTypesRepository {
    findAll(userId: string): Promise<CareType[]>; // returns system defaults + user's own
    findById(userId: string, id: string): Promise<CareType | null>; // returns system or user-owned
    create(data: CreateCareTypeData): Promise<CareType>;
    update(userId: string, id: string, data: UpdateCareTypeData): Promise<CareType | null>;
    delete(userId: string, id: string): Promise<boolean>;
}
