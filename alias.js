// Handle aliases

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { parseArgs } = require("util");

const os = require("os");
const platform = os.type();
const isWindows = platform === "Windows_NT";
const isMac = platform === "Darwin";
const isLinux = platform === "Linux";

const platformName = isWindows ? "windows" : isMac ? "mac" : isLinux ? "linux" : "unknown";

function expandPercentEnvVariables(value) {
    // Expand Windows-style %VAR% tokens and leave unknown variables untouched.
    return value.replace(/%([^%]+)%/g, (match, rawName) => {
        const name = rawName.trim();
        if (name.length === 0) {
            return match;
        }

        const envValue = process.env[name];
        return envValue === undefined ? match : envValue;
    });
}

function readFileJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const aliasConfigFilePaths = [
    path.join(__dirname, "alias.json"),
    path.join(__dirname, "alias.config.json"),
    path.join(expandPercentEnvVariables("%USERPROFILE%/Desktop"), "tools.alias.config.json"),
];

const aliasConfig = aliasConfigFilePaths.map((filePath) => (fs.existsSync(filePath) ? readFileJson(filePath) : {}));

const aliases = aliasConfig.reduce((acc, curr) => ({ ...acc, ...curr }), {});

const { values, positionals: parameters } = parseArgs({
    options: {
        emit: {
            type: "boolean",
            default: false,
        },
        inline: {
            type: "boolean",
            default: false,
        },
    },
    allowPositionals: true,
    strict: false,
});

let { emit, inline } = values;

if (parameters.length === 0) {
    console.log("usage: [alias] [parameters]");
    process.exit(0);
}

const [aliasName, ...others] = parameters;

let script = aliasName;
let args = others;

let alias = aliases[aliasName];
let aliasInline = false;
let aliasEnv = false;
if (alias !== undefined) {
    aliasInline = alias.inline === true;
    aliasEnv = alias.env === true;
    if (typeof alias === "object" && alias !== null) {
        alias = alias[platformName];
    }

    if (typeof alias !== "string") {
        console.error(`invalid alias [${aliasName}]`);
        process.exit(0);
    }

    // Found an alias.
    args = alias.split(" ");
    script = args.shift();
    args.push(...others);
}

if (aliasEnv) {
    script = expandPercentEnvVariables(script);
    args = args.map(expandPercentEnvVariables);
}

if (aliasInline) {
    const allArgs = [emit ? "emit" : "run", script, ...args];
    const command = allArgs.join(" ");
    process.stdout.write(command);
    process.exit(0);
}

// priority order
const scripts = [
    { name: `${script}.js`, commandPrefix: "node.exe", available: isWindows },
    { name: `${script}.js`, commandPrefix: "node", available: isMac || isLinux },
    { name: `${script}.cmd`, commandPrefix: "cmd.exe /c", available: isWindows },
].filter(({ available, name }) => available && fs.existsSync(path.join(__dirname, name)));

if (scripts.length === 0) {
    console.error(`script [${script}] not found`);
    process.exit(0);
}

const { name, commandPrefix } = scripts[0];

const scriptPath = path.join(__dirname, name);
const command = `${commandPrefix} ${scriptPath} ${args.join(" ")}`;
//console.log(command)

if (inline || emit) {
    process.stdout.write(`${emit ? "emit" : "run"} ${command}`);
    process.exit(0);
} else {
    // run alias
    execSync(command, { stdio: "inherit" });
}
