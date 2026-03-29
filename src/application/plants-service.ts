import { Plant, CreatePlantData, PlantsRepository } from '$domain/plant.js';

export class PlantsService {
    constructor(private readonly plants: PlantsRepository) {}

    getAll(userId: string): Promise<Plant[]> {
        return this.plants.findAll(userId);
    }

    getById(id: string): Promise<Plant | null> {
        return this.plants.findById(id);
    }

    create(data: CreatePlantData): Promise<Plant> {
        return this.plants.create(data);
    }
}
