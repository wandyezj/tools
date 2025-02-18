// Handle aliases

const aliases = {
    "branch" : "create-branch"
};

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const parameters = process.argv.slice(2);

if (parameters.length < 0) {
    console.log("usage: [alias] [parameters]");
    process.exit(0);
}

const [alias, ...others] = parameters;

let script = aliases[alias];
if (script === undefined) {
    script = alias;
}
const scriptPath = path.join(__dirname, `${script}.js`);
if (!fs.existsSync(scriptPath)) {
    console.error(`script [${script}] not found`)
    process.exit(0);
}

// run alias
execSync(`node.exe ${scriptPath} ${others.join(" ")}`, {stdio: 'inherit'});
