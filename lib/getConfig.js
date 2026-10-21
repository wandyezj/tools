import * as fs from "node:fs";
import * as path from "node:path";
import { expandPercentEnvVariables } from "./expandPercentEnvVariables.js";
import { readFileJson } from "./readFileJson.js";

/**
 *
 * @param {string} baseDirectory use `__dirname` as the base directory to look for the configuration files.
 * @param {string} name The name of the configuration to retrieve.
 * @param {{printLoaded?: boolean}} options The default configuration to merge with the retrieved configuration.
 * @returns {unknown} The consolidate configuration for the given name.
 */
export function getConfig(baseDirectory, name, options = { printLoaded: false }) {
    const configFilePaths = [
        // Same directory as the caller
        path.join(baseDirectory, `${name}.json`),
        path.join(baseDirectory, `${name}.config.json`),
        ...[
            // Common user directories to look for configuration files
            "%USERPROFILE%/Desktop",
            "%OneDrive%/Desktop",
            "%USERPROFILE%/Documents",
            "%OneDrive%/Documents",
        ]
            .map((value) => [value, `${value}/tools`])
            .flat()
            .map((p) => path.join(expandPercentEnvVariables(p), `tools.${name}.config.json`)),
    ];

    const config = configFilePaths.map((path) => {
        const exists = fs.existsSync(path);
        const object = exists ? readFileJson(path) : {};
        return { path, exists, object };
    });

    if (options.printLoaded) {
        console.log("Loading alias configurations...");
        config.forEach(({ path, exists, object }) => {
            console.log(`${exists ? "." : " "} ${path}`);
        });
    }

    const consolidatedConfig = config.reduce((acc, curr) => ({ ...acc, ...curr.object }), {});

    return consolidatedConfig;
}
