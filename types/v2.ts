export interface MealItem {
    name: string;
    notes: string[]
}

export interface MealSet {
    name: string;
    items: MealItem[];
}

export enum MealType {
    Breakfast = 'Desjejum',
    Lunch = 'Almoço',
    Dinner = 'Jantar'
}

export interface Meal {
    type: MealType | string;
    startTime: Date;
    endTime: Date;
    sets: MealSet[];
}

export interface OperationDay {
    date: Date;
    meals: Meal[];
    note?: string;
}

export interface ArchiveEntry {
    operationDay: OperationDay
    lastUpdatedAt: Date;
    scraperVersionIdentifier: 'rusbe-scraper: v2';
}

export interface ArchiveFileEntry {
    title: string;
    url: string;
}

export type ArchiveIndex = ArchiveFileEntry[];
