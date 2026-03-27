import { Plant, PlantRepository } from '../../domain/plant/plant.js';

export class PlantService {
    constructor(private readonly plants: PlantRepository) {}

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
