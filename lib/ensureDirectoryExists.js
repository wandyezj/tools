import { existsSync, mkdirSync } from "fs";

/**
 * If the directory does not exist, make it.
 * @param {string} directory
 */
export function ensureDirectoryExists(directory) {
    if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }
}
