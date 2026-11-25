import * as fs from "fs";
import { jsoncToJson } from "./parseJsonc.js";

/**
 * Read a JSONC file and parse it into a JSON object.
 * @param {string} filePath
 * @returns {any} The parsed JSON object from the JSONC file.
 */
export function readFileJsonc(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    const clean = jsoncToJson(text);
    const o = JSON.parse(clean);
    return o;
}
