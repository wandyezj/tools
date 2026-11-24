// @ts-check

const fs = require("fs");
const path = require("path");

const referencesDirectory = path.join(__dirname, "..", "references");
const fileNames = fs
    .readdirSync(referencesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

for (const fileName of fileNames) {
    console.log(fileName);
}
