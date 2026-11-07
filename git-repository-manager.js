// Update a list of git repositories.
// The list of repositories to update will be specified in a configuration file.

// use getConfig

const { parseArgs } = require("node:util");
const { basename, resolve } = require("node:path");
const { execSync } = require("node:child_process");
const { getConfig } = require("./lib/getConfig");
const { expandPercentEnvVariables } = require("./lib/expandPercentEnvVariables");

/**
 * @typedef {object} GitRepositoryManagerConfig
 * @property {Array<{string}>} repositories
 */

/**
 *
 * @param {GitRepositoryManagerConfig} previous
 * @param {GitRepositoryManagerConfig} current
 * @returns {GitRepositoryManagerConfig} The merged configuration object.
 */
function reduceConfig(previous, current) {
    // repositories from both previous and current configurations are merged into a single array.
    const repositories = [...(previous.repositories || []), ...(current.repositories || [])];
    return {
        ...previous,
        ...current,
        repositories,
    };
}

/** @type {GitRepositoryManagerConfig} */
const config = getConfig(__dirname, "git-repository-manager", { reduceConfig });

//
// Resolve which repositories to use, handle duplicated and conflicts.
//

let repositories = config.repositories
    // Expand environment variables in repository paths
    .map((base) => {
        const path = resolve(expandPercentEnvVariables(base));
        const name = basename(path);
        return { name, base, path };
    })
    // Remove duplicates based on the repository path (these refer to the same repository)
    .filter((repo, index, self) => self.findIndex((r) => r.path === repo.path) === index);

// Find all repositories that have the same name but different paths
const nameConflicts = repositories.filter(
    (repo, index, self) => self.findIndex((r) => r.name === repo.name && r.path !== repo.path) !== -1
);

// Log the name conflicts
if (nameConflicts.length > 0) {
    console.warn("Repositories with conflicting names but different paths found:");
    nameConflicts.forEach((repo) => console.warn(` - ${repo.name}: ${repo.path}`));
}

// Remove repositories with name conflicts from the main list to avoid ambiguity
repositories = repositories.filter(
    (repo) => !nameConflicts.some((conflict) => conflict.name === repo.name && conflict.path !== repo.path)
);

// Log Repositories and paths
console.log("Repositories:");
repositories.forEach((repo) =>
    console.log(`${repo.name}
    ${repo.base}
    ${repo.path}
`)
);
console.log("");

// Now parse out a command to apply to all repositories
// Use parse args, allow the command fetch use parseArgs

const args = parseArgs({ options: { fetch: { type: "boolean" }, command: { type: "string" } } });

const command = [args.values.command, args.values.fetch ? "fetch" : undefined].filter(Boolean);

if (command.length === 0) {
    console.log("\nNo command specified");
    process.exit(0);
}

// Allowed commands
const allowedCommands = ["fetch"];

if (!command.every((cmd) => allowedCommands.includes(cmd))) {
    console.error(`Invalid command: ${command}`);
    process.exit(1);
}

// Apply the command to all repositories
for (const repo of repositories) {
    console.log(`Applying command "${command.join(" ")}" to repository "${repo.name}"`);
    const separator = "_".repeat(repo.path.length);
    console.log(`\n${separator}\n${repo.path}\n`);
    // Here you would execute the command, e.g., using child_process.exec or similar
    // run git fetch in the repository path
    if (command.includes("fetch")) {
        try {
            execSync("git fetch --verbose", { cwd: repo.path, stdio: "inherit" });
        } catch (error) {
            console.error(`Failed to run git fetch in ${repo.path}:`, error);
        }
    }
}
