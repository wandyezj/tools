// Handle aliases


const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, "alias.json"), "utf8"));


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
    // Found an alias.
    args = alias.split(" ");
    script = args.shift();
    args.push(...others);
}

// priority order
const scripts = [
    { name: `${script}.js`, commandPrefix: "node.exe" },
    { name: `${script}.cmd`, commandPrefix: "cmd.exe /c" },
].filter(({ name }) => fs.existsSync(path.join(__dirname, name)));

if (scripts.length === 0) {
    console.error(`script [${script}] not found`);
    process.exit(0);
}

const { name, commandPrefix } = scripts[0];

const scriptPath = path.join(__dirname, name);
const command = `${commandPrefix} ${scriptPath} ${args.join(" ")}`;
//console.log(command)

// run alias
execSync(command, { stdio: "inherit" });
