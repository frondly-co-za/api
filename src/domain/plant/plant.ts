export interface Plant {
    id: string;
    name: string;
}

export interface PlantRepository {
    findAll(): Promise<Plant[]>;
    findById(id: string): Promise<Plant | null>;
    create(name: string): Promise<Plant>;
}
