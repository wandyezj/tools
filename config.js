// @ts-check

// Copy template configs and modify them
const { join } = require("path");
const { existsSync, copyFileSync } = require("fs");
const { parseArgs } = require("node:util");
const { ensureDirectoryExists } = require("./lib/ensureDirectoryExists");
const { getConfigFilePaths } = require("./lib/getConfig.js");

const templates = ["create-branch", "git-repository-manager", "scheduled-task"];

function commandList() {
    for (const templateName of templates) {
        console.log(`\n\n${templateName}:\n`);
        for (const configPath of getConfigFilePaths(__dirname, templateName)) {
            console.log(configPath);
        }
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

const { values } = parseArgs({
    options: {
        list: { type: "boolean", default: false },
        copy: { type: "boolean", default: false },
    },
});

if (values.list) {
    commandList();
    process.exit(0);
}

if (values.copy) {
    commandCopy();
    process.exit(0);
}
