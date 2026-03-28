import { Plant, PlantsRepository } from '$domain/plant.js';

export class PlantsService {
    constructor(private readonly plants: PlantsRepository) {}

    getAll(): Promise<Plant[]> {
        return this.plants.findAll();
    }

    getById(id: string): Promise<Plant | null> {
        return this.plants.findById(id);
    }

    create(name: string): Promise<Plant> {
        return this.plants.create(name);
    }
}
