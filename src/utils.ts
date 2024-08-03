import { parse } from 'npm:date-fns@3.3.1';
import { zonedTimeToUtc } from 'npm:date-fns-tz@2.0.0';
import { MEAL_TIME_FORMAT_FULL, MEAL_TIME_FORMAT_SHORT, OPERATION_DATE_FORMAT_SHORT, OPERATION_DATE_FORMAT_FULL, RESTAURANT_TIMEZONE } from './constants.ts';

export function capitalizeFirstLetter(stringValue: string) {
    if (stringValue.length === 0) return stringValue;
    return stringValue[0].toUpperCase() + stringValue.slice(1);
}

export function parseMealTimeString(time: string, referenceDate: Date): Date {
    const tentativeParsedTimeAsShortFormat = parse(time, MEAL_TIME_FORMAT_SHORT, referenceDate);

    if (!isNaN(tentativeParsedTimeAsShortFormat.getTime())) {
        return zonedTimeToUtc(tentativeParsedTimeAsShortFormat, RESTAURANT_TIMEZONE);
    }

    const parsedTimeAsFullFormat = parse(time, MEAL_TIME_FORMAT_FULL, referenceDate);
    return zonedTimeToUtc(parsedTimeAsFullFormat, RESTAURANT_TIMEZONE);
}

export function parseMealDateString(date: string): Date {
    const tentativeParsedDateAsShortFormat = parse(date, OPERATION_DATE_FORMAT_SHORT, new Date());
    
    if (!isNaN(tentativeParsedDateAsShortFormat.getTime())) {
        return zonedTimeToUtc(tentativeParsedDateAsShortFormat, RESTAURANT_TIMEZONE);
    }

    const parsedDateAsFullFormat = parse(date, OPERATION_DATE_FORMAT_FULL, new Date());
    return zonedTimeToUtc(parsedDateAsFullFormat, RESTAURANT_TIMEZONE);
}
