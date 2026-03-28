export interface Plant {
    id: string;
    name: string;
}

export interface PlantsRepository {
    findAll(): Promise<Plant[]>;
    findById(id: string): Promise<Plant | null>;
    create(name: string): Promise<Plant>;
}
