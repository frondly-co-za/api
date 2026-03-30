import {
    CareType,
    CreateCareTypeData,
    UpdateCareTypeData,
    CareTypesRepository
} from '$domain/care-type.js';

export class CareTypesService {
    constructor(private readonly careTypes: CareTypesRepository) {}

    getAll(userId: string): Promise<CareType[]> {
        return this.careTypes.findAll(userId);
    }

    getById(id: string): Promise<CareType | null> {
        return this.careTypes.findById(id);
    }

    create(data: CreateCareTypeData): Promise<CareType> {
        return this.careTypes.create(data);
    }

    update(id: string, data: UpdateCareTypeData): Promise<CareType | null> {
        return this.careTypes.update(id, data);
    }

    delete(id: string): Promise<boolean> {
        return this.careTypes.delete(id);
    }
}
