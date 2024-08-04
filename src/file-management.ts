import superjson from 'npm:superjson@2.2.1';

import { ArchiveFileEntry, ArchiveIndex, ArchiveEntry, OperationDay } from './types/v2.ts';
import { CURRENT_SCRAPER_VERSION, OUTPUT_ROOT_DIRECTORY_PATH, ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH, ARCHIVE_URL } from './constants.ts';
import { getArchiveEntryFilenameDateFormatString } from './utils.ts';

export function saveScrapingOutput(operationDays: OperationDay[]) {
    createTargetDirectory();

    for (const operationDay of operationDays) {
        createArchiveEntryFile(operationDay);
    }

    createIndexFile();
}

function createTargetDirectory() {
    Deno.mkdirSync(`${OUTPUT_ROOT_DIRECTORY_PATH}/${ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH}`, { recursive: true });
}

function createArchiveEntryFile(operationDay: OperationDay) {
    const archiveEntryFilePath = `${OUTPUT_ROOT_DIRECTORY_PATH}/${ARCHIVE_ENTRY_JSON_FILES_DIRECTORY_PATH}/${getArchiveEntryFilenameDateFormatString(operationDay.date)}.json`;
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
