const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const parameters = process.argv.slice(2);

if (parameters.length !== 1) {
    console.log("usage: [branch name]");
    process.exit(0);
}

const [branchName] = parameters;

let branchPrefix = "";
const configPath = path.join(__dirname, "create-branch.config.json");
if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath, { encoding: "utf-8" });
    try {
        const config = JSON.parse(data);
        const prefix = config["prefix"];
        if (typeof prefix === "string") {
            branchPrefix = prefix;
        } else {
            throw "Invalid Prefix";
        }
    } catch {
        console.error(`Invalid config ${configPath}\n${data}`);
        process.exit(0);
    }
}

const branch = `${branchPrefix}${branchName}`;

const validBranch = /^([a-z]|-|\/|[0-9])*$/;

if (!validBranch.test(branch)) {
    console.error(`Invalid branch name: ${branch}`);
    process.exit(0);
}

execSync(`git checkout -b ${branch}`, {stdio: 'inherit'});
