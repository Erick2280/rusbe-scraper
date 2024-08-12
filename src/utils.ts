// @deno-types="npm:@types/luxon@3"
import { DateTime } from 'npm:luxon@3.5.0';
import { MEAL_TIME_FORMAT_FULL, MEAL_TIME_FORMAT_SHORT, OPERATION_DATE_FORMAT_SHORT, OPERATION_DATE_FORMAT_FULL, RESTAURANT_TIMEZONE, ARCHIVE_ENTRY_FILENAME_DATE_FORMAT, RESTAURANT_LOCALE } from './constants.ts';

export function capitalizeFirstLetter(stringValue: string) {
    if (stringValue.length === 0) return stringValue;
    return stringValue[0].toUpperCase() + stringValue.slice(1);
}

export function parseMealTimeString(time: string, reference: DateTime<true>): DateTime<true> {
    const timeFormats = [MEAL_TIME_FORMAT_SHORT, MEAL_TIME_FORMAT_FULL];

    for (const timeFormat of timeFormats) {
        const tentativeParsedDateTime = DateTime.fromFormat(time, timeFormat, { zone: RESTAURANT_TIMEZONE, locale: RESTAURANT_LOCALE })

        if (tentativeParsedDateTime.isValid) {
            return reference.plus({
                hours: tentativeParsedDateTime.hour,
                minutes: tentativeParsedDateTime.minute
            })
        }
    }

    throw new Error('TimeParsingFailed')
}

export function parseMealDateString(date: string): DateTime<true> {
    const dateFormats = [OPERATION_DATE_FORMAT_SHORT, OPERATION_DATE_FORMAT_FULL];

    for (const dateFormat of dateFormats) {
        const tentativeParsedDate = DateTime.fromFormat(date, dateFormat, { zone: RESTAURANT_TIMEZONE, locale: RESTAURANT_LOCALE })

        if (tentativeParsedDate.isValid) {
            return tentativeParsedDate
        }
    }

    throw new Error('DateParsingFailed')
}

export function getArchiveEntryFilenameDateFormatString(date: Date | DateTime<true>): string {
    let dateTime: DateTime;
    
    if (date instanceof Date) {
        dateTime = DateTime
            .fromJSDate(date)
            .setZone(RESTAURANT_TIMEZONE)
            .setLocale(RESTAURANT_LOCALE)
    } else {
        dateTime = date
    }

    if (!dateTime.isValid) {
        throw new Error('DateParsingFailed')
    }

    return (dateTime as DateTime<true>).toISODate()
}
