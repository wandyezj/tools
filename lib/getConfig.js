// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";
import { expandPercentEnvVariables } from "./expandPercentEnvVariables.js";
import { readFileJsonc } from "./readFileJsonc.js";

/**
 * @typedef {object} ConfigSearchEntry
 * @property {string} id Location ID used by the search configuration's configs array.
 * @property {string} [base] Base directory, an environment placeholder such as `%r%`.
 * @property {string} subdirectory Directory under base, or the caller's base directory when base is omitted.
 * @property {string} configName Filename: <name>.config.json for tools, tools.<name>.config.json elsewhere.
 * @property {string} fullPath Joined base, subdirectory, and filename before environment expansion.
 * @property {string} fullPathExpanded Joined path after expanding environment variables in base.
 * @property {boolean} valid Whether the base env variable can be expanded. i.e. variable is defined in the environment.
 * @property {boolean} exists Whether fullPathExpanded exists on disk when the entry is created.
 */

/**
 * @param {string} name
 * @returns {boolean} True if the configuration name is valid.
 */
export function isValidConfigName(name) {
    // Require a lowercase first letter and disallow uppercase letters and consecutive hyphens.
    return /^(?!.*--)[a-z][a-z0-9-]*$/.test(name);
}

/**
 * @param {string} baseDirectory
 * @param {string} name
 * @returns {ConfigSearchEntry[]}
 */
export function getConfigSearch(baseDirectory, name) {
    /**
     * @type {{ id: string, base?: string, subdirectory: string, configName?: string }[]}
     */
    const configSearch = [
        { id: "tools", subdirectory: baseDirectory, configName: `${name}.config.json` },
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

    const configs = configSearch.map((entry) => {
        const { base, subdirectory } = entry;
        const baseExpanded = base ? expandPercentEnvVariables(base) : undefined;
        const valid =
            baseExpanded === undefined ||
            !(baseExpanded.startsWith("%") && baseExpanded.endsWith("%") && baseExpanded !== base);

        const configName = entry.configName || `tools.${name}.config.json`;
        const fullPath = path.join(base || "", subdirectory, configName);
        const fullPathExpanded = path.join(baseExpanded || "", subdirectory, configName);
        const exists = fs.existsSync(fullPathExpanded);

        return { ...entry, configName, fullPath, fullPathExpanded, valid, exists };
    });

    return configs;
}

/**
 * @param {string} baseDirectory
 * @returns {string[]} Enabled location IDs, or undefined when all locations are enabled.
 */
export function getConfigIds(baseDirectory) {
    // Read the search configuration file to get the list of configs by id to search for.
    const searchConfigPath = path.join(baseDirectory, "config.config.json");
    /**
     * @type {{ configs?: string[] }}
     */
    const searchConfig = fs.existsSync(searchConfigPath) ? readFileJsonc(searchConfigPath) : undefined;

    const configIds = searchConfig?.configs || [];
    if (configIds !== undefined && (!Array.isArray(configIds) || !configIds.every((id) => typeof id === "string"))) {
        throw new Error(`Invalid search configuration: ${searchConfigPath}, configs must be an array of strings`);
    }
    return configIds;
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

    const configIds = getConfigIds(baseDirectory);
    const configSearch = getConfigSearch(baseDirectory, name);

    const configFilePaths = configSearch
        .filter(({ id }) => configIds.includes(id))
        .filter(({ valid }) => valid)
        .map(({ fullPathExpanded }) => fullPathExpanded);

    return configFilePaths;
}

/**
 *
 * @param {string} baseDirectory use `__dirname` as the base directory to look for the configuration files.
 * @param {string} name The name of the configuration to retrieve.
 * @returns {{ path: string, exists: boolean, object: any }[]}
 */
export function getConfigs(baseDirectory, name) {
    const configFilePaths = getConfigFilePaths(baseDirectory, name);

    const configs = configFilePaths.map((path) => {
        const exists = fs.existsSync(path);
        const object = exists ? readFileJsonc(path) : {};
        return { path, exists, object };
    });
    return configs;
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

    const configs = getConfigs(baseDirectory, name);

    if (printLoaded) {
        console.log("Loading alias configurations...");
        configs.forEach(({ path, exists, object }) => {
            console.log(`${exists ? "." : " "} ${path}`);
        });
    }

    const consolidatedConfig = configs.map(({ object }) => object).reduce((acc, curr) => reduceConfig(acc, curr), {});

    return /** @type {T} */ (consolidatedConfig);
}
