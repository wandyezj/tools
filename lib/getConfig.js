// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";
import { expandPercentEnvVariables } from "./expandPercentEnvVariables.js";
import { readFileJson } from "./readFileJson.js";

/**
 * @param {string} name
 * @returns {boolean} True if the configuration name is valid.
 */
export function isValidConfigName(name) {
    // Require a lowercase first letter and disallow uppercase letters and consecutive hyphens.
    return /^(?!.*--)[a-z][a-z0-9-]*$/.test(name);
}

/**
 * @param {string} baseDirectory use `__dirname` as the base directory to look for the configuration files.
 * @param {string} name The name of the configuration to retrieve.
 * @returns {string[]} All configuration file search locations for the given name.
 */
export function getConfigFilePaths(baseDirectory, name) {
    if (!isValidConfigName(name)) {
        throw new Error(
            `Invalid configuration name: ${name}, must start with a lowercase letter and contain only lowercase letters, digits, or hyphens, without consecutive hyphens`
        );
    }

    const configName = `tools.${name}.config.json`;

    /**
     * Config Search
     * @type {{ id: string, base?: string, subdirectory?: string, configNameOverride?: string }[]}
     */
    const configSearch = [
        { id: "tools", subdirectory: baseDirectory, configNameOverride: `${name}.config.json` },
        { id: "userprofile-desktop", base: "%USERPROFILE%", subdirectory: "Desktop" },
        { id: "userprofile-desktop-tools", base: "%USERPROFILE%", subdirectory: "Desktop/tools" },
        { id: "userprofile-documents", base: "%USERPROFILE%", subdirectory: "Documents" },
        { id: "userprofile-documents-tools", base: "%USERPROFILE%", subdirectory: "Documents/tools" },
        { id: "onedrive-desktop", base: "%OneDrive%", subdirectory: "Desktop" },
        { id: "onedrive-desktop-tools", base: "%OneDrive%", subdirectory: "Desktop/tools" },
        { id: "onedrive-documents", base: "%OneDrive%", subdirectory: "Documents" },
        { id: "onedrive-documents-tools", base: "%OneDrive%", subdirectory: "Documents/tools" },
        { id: "r-config", base: "%r%", subdirectory: "config" },
        { id: "r-dot-config", base: "%r%", subdirectory: ".config" },
    ];

    // Map the configSearch to file paths. Exclude any entries where the base starts and ends with % but is not present as an env variable.
    const configFilePaths = configSearch
        .map(({ base, subdirectory, configNameOverride }) => {
            const baseExpanded = base ? expandPercentEnvVariables(base) : undefined;
            const valid =
                baseExpanded === undefined ||
                !(baseExpanded.startsWith("%") && baseExpanded.endsWith("%") && baseExpanded !== base);

            const configFileName = configNameOverride || configName;
            const configPath = [baseExpanded, subdirectory, configFileName].filter(
                /** @returns {part is string} */
                (part) => typeof part === "string" && part.length > 0
            );
            const fullPath = path.join(...configPath);

            return {
                valid,
                fullPath,
            };
        })
        .filter(({ valid }) => valid)
        .map(({ fullPath }) => fullPath);

    return configFilePaths;
}

/**
 *
 * @template T
 * @param {string} baseDirectory use `__dirname` as the base directory to look for the configuration files.
 * @param {string} name The name of the configuration to retrieve.
 * @param {{printLoaded?: boolean, reduceConfig?: (previous: T, current: T) => T}} [options] The default configuration to merge with the retrieved configuration.
 *
 * @returns {T} The consolidated configuration for the given name.
 */
export function getConfig(baseDirectory, name, options) {
    const defaultOptions = {
        printLoaded: false,
        /** @type {(previous: T, current: T) => T} */
        reduceConfig: (previous, current) => ({ ...previous, ...current }),
        ...options,
    };

    const { printLoaded, reduceConfig } = { ...defaultOptions, ...options };

    const configFilePaths = getConfigFilePaths(baseDirectory, name);

    const configs = configFilePaths.map((path) => {
        const exists = fs.existsSync(path);
        const object = exists ? readFileJson(path) : {};
        return { path, exists, object };
    });

    if (printLoaded) {
        console.log("Loading alias configurations...");
        configs.forEach(({ path, exists, object }) => {
            console.log(`${exists ? "." : " "} ${path}`);
        });
    }

    const consolidatedConfig = configs.map(({ object }) => object).reduce((acc, curr) => reduceConfig(acc, curr), {});

    return /** @type {T} */ (consolidatedConfig);
}
