import * as cheerio from 'npm:cheerio@1.0.0-rc.12';
import { parse, format } from 'npm:date-fns@3.3.1';
import { zonedTimeToUtc } from 'npm:date-fns-tz@2.0.0';

import { CURRENT_SCRAPER_VERSION, OPERATION_DATE_FORMAT, ARCHIVE_ENTRY_FILENAME_DATE_FORMAT, RESTAURANT_TIMEZONE } from './constants.ts';
import { Meal, MealItem, MealSet, MealType, OperationDay } from './types/v2.ts';
import { capitalizeFirstLetter, parseMealTimeString } from './utils.ts';
import { saveScrapingOutput } from './file-management.ts';

export const PAGE_URL = 'https://www.ufpe.br/restaurante';

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

saveScrapingOutput(operationDays);