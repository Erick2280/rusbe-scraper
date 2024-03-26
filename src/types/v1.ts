/**
 * @deprecated Use the last version of the types.
 */
export interface MealItem {
    name: string;
    notes: string[]
}

/**
 * @deprecated Use the last version of the types.
 */
export interface MealSet {
    name: string;
    items: MealItem[];
}

/**
 * @deprecated Use the last version of the types.
 */
export enum MealType {
    Breakfast = 'Desjejum',
    Lunch = 'Almoço',
    Dinner = 'Jantar'
}

/**
 * @deprecated Use the last version of the types.
 */
export interface Meal {
    type: MealType | string;
    startTime: Date;
    endTime: Date;
    sets: MealSet[];
}

/**
 * @deprecated Use the last version of the types.
 */
export interface OperationDay {
    date: Date;
    meals: Meal[];
    note?: string;
}

/**
 * @deprecated Use the last version of the types.
 */
export interface ScrapingResult {
    operationDay: OperationDay
    lastUpdatedAt: Date;
    scraperVersionIdentifier: 'rusbe-scraper: v1';
}

/**
 * @deprecated Use the last version of the types.
 */
export interface ScrapedFileEntry {
    title: string;
    url: string;
}

/**
 * @deprecated Use the last version of the types.
 */
export type ScrapedFilesIndex = ScrapedFileEntry[];
