import { existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Deletes all contents of the specified directory.
 * @param {string} directory
 */
export function clearDirectory(directory) {
    if (existsSync(directory)) {
        for (const item of readdirSync(directory)) {
            rmSync(join(directory, item), { recursive: true, force: true });
        }
    }
}
