export interface ScrapingResult {
    operationDay: OperationDay
    lastUpdatedAt: Date;
    scraperVersionIdentifier: 'rusbe-scraper: v1';
}

export interface OperationDay {
    date: Date;
    meals: Meal[];
    note?: string;
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

export interface MealSet {
    name: string;
    items: MealItem[];
}

export interface MealItem {
    name: string;
    notes: string[]
}
