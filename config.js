// @ts-check

// Copy template configs and modify them
const { join } = require("path");
const { existsSync, copyFileSync } = require("fs");
const { parseArgs } = require("node:util");
const { ensureDirectoryExists } = require("./lib/ensureDirectoryExists");
const { getConfigs, getConfigSearch, getConfigIds } = require("./lib/getConfig.js");

const templates = ["create-branch", "git-repository-manager", "scheduled-task"];

function commandHelp() {
    console.log(`Usage:
    t config -- [options]
    node config.js [options]

Options:
    --help, -h   Show this help.
    --locations  Show all search locations, enable status, and config existence.
        --tsv        Use tab-separated output with --locations (default: aligned spaces).
    --list       List enabled search paths for each command template.
    --copy       Copy missing command templates to %r%/.config.
                             Requires r to point to an existing directory; preserves existing files.

Markers:
    . in enable means the location is enabled.
    . in a command column or --list means the config file exists.
    Blank cells mean disabled or missing, respectively.

Examples:
    t config -- --locations
    t config -- --locations --tsv
    t config -- --list
    t config -- --copy

Choose one command: --help, --locations, --list, or --copy.
Use --tsv only with --locations.`);
}

function commandList() {
    for (const templateName of templates) {
        console.log(`\n\n${templateName}:\n`);
        for (const { path: configPath, exists } of getConfigs(__dirname, templateName)) {
            console.log(`${exists ? "." : " "}  ${configPath}`);
        }
    }
}

/** @param {boolean} tsv */
function commandLocations(tsv) {
    const configIds = getConfigIds(__dirname);
    const searches = templates.map((templateName) => getConfigSearch(__dirname, templateName));
    const rows = [["id", "path", "enable", ...templates]];
    for (const { id, base, subdirectory } of searches[0]) {
        const directory = base ? `${base}/${subdirectory}` : subdirectory;
        const enabled = configIds === undefined || configIds.includes(id);
        const markers = searches.map((entries) => (entries.find((entry) => entry.id === id)?.exists ? "." : ""));
        rows.push([id, directory, enabled ? "." : "", ...markers]);
    }
    const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
    for (const row of rows) {
        console.log(tsv ? row.join("\t") : row.map((cell, column) => cell.padEnd(widths[column])).join("  "));
    }
}

function commandCopy() {
    const rDirectory = process.env["r"];
    if (!rDirectory) {
        throw new Error("Environment variable 'r' is not set");
    }

    const rExists = existsSync(rDirectory);
    if (!rExists) {
        throw new Error(`Directory specified by environment variable 'r' does not exist: ${rDirectory}`);
    }

    const rConfigDirectory = join(rDirectory, ".config");
    ensureDirectoryExists(rConfigDirectory);

    // Copy the search config template into tools without overwriting an existing config.
    const searchTemplatePath = join(__dirname, "config.config.template.json");
    const searchConfigPath = join(__dirname, "config.config.json");
    if (!existsSync(searchConfigPath)) {
        console.log("Copy: config.config.template.json -> config.config.json");
        copyFileSync(searchTemplatePath, searchConfigPath);
    }

    // Copy template configs to the .config directory
    templates.forEach((templateName) => {
        const templateFileName = `${templateName}.config.template.json`;
        const configFileName = `tools.${templateName}.config.json`;

        console.log(`Copy: ${templateFileName} -> ${configFileName}`);

        const templateFilePath = join(__dirname, templateFileName);
        const destinationFilePath = join(rConfigDirectory, configFileName);

        if (!existsSync(destinationFilePath)) {
            copyFileSync(templateFilePath, destinationFilePath);
        }
    });
}

/** @enum {string} */
const Command = Object.freeze({
    Help: "Help",
    Locations: "Locations",
    List: "List",
    Copy: "Copy",
});

const { values } = parseArgs({
    options: {
        help: { type: "boolean", short: "h", default: false },
        locations: { type: "boolean", default: false },
        tsv: { type: "boolean", default: false },
        list: { type: "boolean", default: false },
        copy: { type: "boolean", default: false },
    },
});

/**
 * @typedef {object} CommandEntry
 * @property {boolean} value Whether the command's CLI option is selected.
 * @property {() => void} run Function that executes the command.
 */

/** @type {Record<(typeof Command)[keyof typeof Command], CommandEntry>} */
const commandMap = {
    [Command.Help]: { value: values.help, run: commandHelp },
    [Command.Locations]: { value: values.locations, run: () => commandLocations(values.tsv) },
    [Command.List]: { value: values.list, run: commandList },
    [Command.Copy]: { value: values.copy, run: commandCopy },
};

const commands = Object.values(commandMap).filter(({ value }) => value);
if (commands.length !== 1) {
    console.error("Choose only one command: --help, --locations, --list, or --copy.");
    process.exit(1);
}

if (values.tsv && !values.locations) {
    console.error("--tsv requires --locations.");
    process.exit(1);
}

const command = commands.pop();

if (command) {
    command.run();
}
