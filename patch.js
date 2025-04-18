//
// Patch the package.json version and update the CHANGELOG.md file with a new entry
//
const { execSync } = require("child_process");
const fs = require("fs");
const parameters = process.argv.slice(2);

if (parameters.length != 0) {
    console.log(
        "usage: run in directory with package.json and CHANGELOG.md files"
    );
    process.exit(0);
}

const packageJsonPath = "./package.json";
const changelogMdPath = "./CHANGELOG.md";

// Check for package.json file in the current directory
if (!fs.existsSync(packageJsonPath)) {
    console.error(`package.json not found in the current directory`);
    process.exit(1);
}

execSync(`npm version patch`, { stdio: "inherit" });

// Check for CHANGELOG.md file in the current directory
if (!fs.existsSync(changelogMdPath)) {
    console.log(`CHANGELOG.md not found in the current directory`);
    process.exit(0);
}

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Get the current version
const currentVersion = packageJson.version;

// Read the CHANGELOG.md file
const changelogMd = fs.readFileSync(changelogMdPath, "utf8");

// Check if the current version is already in the CHANGELOG.md file
const versionRegex = new RegExp(`^## \\[${currentVersion}\\]`, "m");
if (versionRegex.test(changelogMd)) {
    console.log(`Version ${currentVersion} already exists in CHANGELOG.md`);
    process.exit(0);
}

// Get the current date
const currentDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

// Create the new version entry
const newVersionEntry = `## [${currentVersion}] - ${currentDate}\n\n`;

// Append the new version entry to the CHANGELOG.md file
// Replace the [Unreleased] section with the new version entry
const changelogMdUpdated = changelogMd.replace(
    /## \[Unreleased\]/,
    `## [Unreleased]\n\n${newVersionEntry}`
);
fs.writeFileSync(changelogMdPath, changelogMdUpdated, "utf8");
