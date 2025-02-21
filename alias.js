// Handle aliases

const aliases = {
    "branch" : "create-branch",
    "style" : "command npm run style",
    "lint": "command npm run lint",
};

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const parameters = process.argv.slice(2);

if (parameters.length < 0) {
    console.log("usage: [alias] [parameters]");
    process.exit(0);
}

const [aliasName, ...others] = parameters;

let script = aliasName;
let args = others;

let alias = aliases[aliasName];
if (alias !== undefined) {
    args = alias.split(" ");
    script = args.shift();
    args.push(...others);
}

const scriptPath = path.join(__dirname, `${script}.js`);
if (!fs.existsSync(scriptPath)) {
    console.error(`script [${script}] not found`)
    process.exit(0);
}

const command = `node.exe ${scriptPath} ${args.join(" ")}`;
//console.log(command)

// run alias
execSync(command, {stdio: 'inherit'});
