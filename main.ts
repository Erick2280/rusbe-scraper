import * as cheerio from 'npm:cheerio@1.0.0-rc.12';
import { parse, format } from 'npm:date-fns@3.3.1';
import { zonedTimeToUtc } from 'npm:date-fns-tz@2.0.0';
import superjson from 'npm:superjson@2.2.1';

import { Meal, MealItem, MealSet, MealType, OperationDay, ArchiveFileEntry, ArchiveIndex, ArchiveEntry } from './types/v2.ts';

const PAGE_URL = 'https://www.ufpe.br/restaurante';
const ARCHIVE_URL = 'https://archive.rusbe.riso.dev';
const RESTAURANT_TIMEZONE = 'America/Recife';
const OPERATION_DATE_FORMAT = 'dd/MM';
const MEAL_TIME_FORMAT_FULL = `H'h'mm`;
const MEAL_TIME_FORMAT_SHORT = `H'h'`;
const ARCHIVE_ENTRY_FILENAME_DATE_FORMAT = 'yyyy-MM-dd';
const OUTPUT_ROOT_DIRECTORY_PATH = './dist';
const ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH = `days`;
const CURRENT_SCRAPER_VERSION = 'rusbe-scraper: v2';

console.log(`${CURRENT_SCRAPER_VERSION} - Fetching ${PAGE_URL}`)

const response = await fetch(PAGE_URL); // TODO: retry automatically if failed
const responseText = await response.text();

console.log(`${CURRENT_SCRAPER_VERSION} - Scraping ${PAGE_URL}`)

const page = cheerio.load(responseText);

const operationDaySections = page('section.tabs__content');
const operationDays: OperationDay[] = [];

for (const section of operationDaySections) {
    const sectionId = page(section).attr('id');
    const sectionTitle = page(`span[role="tab"][aria-controls="${sectionId}"]`).text().trim();
    
    const [sectionDay, note] = sectionTitle.split('-').map(text => text.trim());
    const [_weekDay, dateString] = (() => {
        const splittedSectionDay = sectionDay.split(' ').map(text => text.trim());
        
        if (splittedSectionDay.length >= 2) {
            return splittedSectionDay
        }
        
        const possibleWeekDayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
        const weekDay = possibleWeekDayNames.find(weekDay => sectionDay.includes(weekDay));
        if (weekDay) {
            const date = sectionDay.replace(weekDay, '').trim();
            return [weekDay, date];
        }

        console.log(`${CURRENT_SCRAPER_VERSION} - Could not parse week day from ${sectionDay}`)
        return ['', sectionDay];
    })()

    const date = zonedTimeToUtc(parse(dateString, OPERATION_DATE_FORMAT, new Date()), RESTAURANT_TIMEZONE);

    console.log(`${CURRENT_SCRAPER_VERSION} - Scraping ${format(date, ARCHIVE_ENTRY_FILENAME_DATE_FORMAT)}`);

    const operationDay: OperationDay = {
        date,
        meals: [],
        note
    }

    const tableRows = page('table tr', section);
    let foundTableHeader = false;
    const indexedMeals: {
        meal: Meal,
        index: number
    }[] = [];

    for (const row of tableRows) {
        if (foundTableHeader) {
            const mealSetCells = page('td', row).toArray();
            const mealSetNameCell = mealSetCells.shift();
            const mealSetName = page(mealSetNameCell)?.text().trim();

            if (mealSetName == null || mealSetName === '' || mealSetCells.length === 0) {
                continue;
            }

            for (const [index, cell] of mealSetCells.entries()) {
                if (page(cell).text().trim() === '') {
                    continue;
                }

                const mealSet: MealSet = {
                    name: mealSetName,
                    items: []
                };

                const mealSetItems = page('li', cell);
                for (const item of mealSetItems) {
                    const mealString = page(item).text().trim().normalize('NFKD');
                    const dividedMealStrings = mealString.split(' ou ');

                    const mealItems: MealItem[] = dividedMealStrings.map(mealString => {
                        const notes = mealString.match(/\(([^)]+)\)/g);

                        if (notes != null && notes.length > 0) {
                            let strippedMealString = mealString
                            for (const note of notes) {
                                strippedMealString = strippedMealString.replace(note, '');
                            }
                            return {
                                name: capitalizeFirstLetter(strippedMealString.trim()),
                                notes: notes.map(note =>
                                    note.trim()
                                        .replace('(', '')
                                        .replace(')', ''))
                            };
                        } else {
                            return {
                                name: capitalizeFirstLetter(mealString.trim()),
                                notes: []
                            }
                        }
                    });
                    
                    mealSet.items.push(...mealItems);
                }

                indexedMeals.find(indexedMeal => indexedMeal.index === index)?.meal.sets.push(mealSet);
            } 
        } else {
            const headerCells = page('h4', row);
            if (headerCells.length > 0) {
                foundTableHeader = true;
                for (const [index, cell] of headerCells.toArray().entries()) {
                    const [mealType, mealTime] = page(cell).text().split('-').map(text => text.trim());
                    const [startTime, endTime] = mealTime.split('às').map(text => text.trim());
    
                    const meal: Meal = {
                        type: mealType as MealType,
                        startTime: parseMealTimeString(startTime, operationDay.date),
                        endTime: parseMealTimeString(endTime, operationDay.date),
                        sets: []
                    };

                    indexedMeals.push({ meal, index });
                }
            }
        }
    }

    for (const indexedMeal of indexedMeals) {
        if (indexedMeal.meal.sets.length > 0) {
            operationDay.meals.push(indexedMeal.meal);
        }
    }

    operationDays.push(operationDay);
}

console.log(`${CURRENT_SCRAPER_VERSION} - Scraping finished, ${operationDays.length} days found`);

createTargetDirectory()

for (const operationDay of operationDays) {
    saveScrapingOutput(operationDay);
}

createIndexFile();

function capitalizeFirstLetter(stringValue: string) {
    if (stringValue.length === 0) return stringValue;
    return stringValue[0].toUpperCase() + stringValue.slice(1);
}


function parseMealTimeString(time: string, referenceDate: Date): Date {
    const tentativeParsedTimeAsShortFormat = parse(time, MEAL_TIME_FORMAT_SHORT, referenceDate);

    if (!isNaN(tentativeParsedTimeAsShortFormat.getTime())) {
        return zonedTimeToUtc(tentativeParsedTimeAsShortFormat, RESTAURANT_TIMEZONE);
    }

    const parsedTimeAsFullFormat = parse(time, MEAL_TIME_FORMAT_FULL, referenceDate);
    return zonedTimeToUtc(parsedTimeAsFullFormat, RESTAURANT_TIMEZONE);
}

function createTargetDirectory() {
    Deno.mkdirSync(`${OUTPUT_ROOT_DIRECTORY_PATH}/${ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH}`, { recursive: true });
}

function saveScrapingOutput(operationDay: OperationDay) {
    const archiveEntryFilePath = `${OUTPUT_ROOT_DIRECTORY_PATH}/${ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH}/${format(operationDay.date, ARCHIVE_ENTRY_FILENAME_DATE_FORMAT)}.json`;
    const archiveEntry: ArchiveEntry = {
        operationDay,
        lastUpdatedAt: new Date(),
        scraperVersionIdentifier: CURRENT_SCRAPER_VERSION
    }

    try {
        const existingArchiveEntryPayload = Deno.readTextFileSync(archiveEntryFilePath);
        const existingArchiveEntry: ArchiveEntry = superjson.parse(existingArchiveEntryPayload);

        if (superjson.stringify(existingArchiveEntry.operationDay) === superjson.stringify(archiveEntry.operationDay)) {
            // The file already exists and the payload is the same, so it won't be updated
            console.log(`${CURRENT_SCRAPER_VERSION} - Skipping ${archiveEntryFilePath} because it is already up-to-date`)
            return;
        }

    } catch (_error) {
        // The file does not exist, so it will be created
    }

    const archiveEntryPayload = superjson.stringify(archiveEntry);
    console.log(`${CURRENT_SCRAPER_VERSION} - Saving ${archiveEntryFilePath}`)
    Deno.writeTextFileSync(archiveEntryFilePath, archiveEntryPayload);
}

function createIndexFile() {
    const indexFilePath = `${OUTPUT_ROOT_DIRECTORY_PATH}/index.json`;
    const archiveIndex: ArchiveIndex = [];

    for (const entry of Deno.readDirSync(`${OUTPUT_ROOT_DIRECTORY_PATH}/${ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH}`)) {
        if (entry.isFile && entry.name.endsWith('.json')) {
            const title = entry.name.replace('.json', '')
            const archiveFileEntry: ArchiveFileEntry = {
                title,
                url: `${ARCHIVE_URL}/${ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH}/${entry.name}`
            }

            archiveIndex.push(archiveFileEntry);
        }
    }

    archiveIndex.sort((a, b) => a.title.localeCompare(b.title));

    const indexPayload = superjson.stringify(archiveIndex);
    console.log(`${CURRENT_SCRAPER_VERSION} - Saving index file`)
    Deno.writeTextFileSync(indexFilePath, indexPayload);
}
