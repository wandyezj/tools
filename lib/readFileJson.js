import * as fs from "fs";

export function readFileJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
