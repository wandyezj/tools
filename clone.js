/*
    Clone a git repository into path specified by the environment variable 'r'.
*/
const { execSync } = require("child_process");

const parameters = process.argv.slice(2);

if (parameters.length !== 1) {
    console.log("usage: [clone url]");
    process.exit(0);
}

/**
 * Https clone url
 */
const [cloneUrl] = parameters;

const repositoryRoot = process.env["r"];
if (!repositoryRoot) {
    console.error("Missing repository root 'r' in environment variables");
    process.exit(0);
}

execSync(`git clone ${cloneUrl}`, { stdio: "inherit", cwd: repositoryRoot });
