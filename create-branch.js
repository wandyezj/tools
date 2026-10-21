const { execSync } = require("node:child_process");
const fs = require("node:fs");
const { getConfig } = require("./lib/getConfig");

const parameters = process.argv.slice(2);

if (parameters.length !== 1) {
    console.log("usage: [branch name]");
    process.exit(0);
}

const [branchName] = parameters;

const config = getConfig(__dirname, "create-branch", { printLoaded: false });

let branchPrefix = "";
try {
    const prefix = config["prefix"];
    if (typeof prefix === "undefined") {
        // none defined, use empty prefix.
        branchPrefix = "";
    } else if (typeof prefix === "string") {
        branchPrefix = prefix;
    } else {
        throw "Invalid Prefix";
    }
} catch {
    console.error(`Invalid config ${configPath}\n${data}`);
    process.exit(0);
}

const branch = `${branchPrefix}${branchName}`;

const validBranch = /^([a-z]|-|\/|[0-9])*$/;

if (!validBranch.test(branch)) {
    console.error(`Invalid branch name: ${branch}`);
    process.exit(0);
}

execSync(`git checkout -b ${branch}`, { stdio: "inherit" });
