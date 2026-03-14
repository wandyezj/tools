#!/usr/bin/env node

// Download mp3s from YouTube URLs using yt-dlp to the Desktop.

const { spawnSync } = require("node:child_process");
const fs = require("fs");

const parameters = process.argv.slice(2);

if (parameters.length !== 1) {
    console.error(`Usage: node download-mp3.js <YouTube URL> | <Text File> | <TSV File>

- YouTube URL, it will download the video's audio as an mp3 to the Desktop.
- Text File, containing one YouTube URL per line - each url will be downloaded as an mp3 to the Desktop.
- TSV File, containing lines of the format "Name<TAB>URL". Downloads each URL as a mp3 to the Desktop, unless there is already a file containing the name on the Desktop.

Prerequisites:

Install the latest yt-dlp and ffmpeg and make sure they are in your PATH.

Mac:

    brew install ffmpeg yt-dlp

`);
    process.exit(1);
}

const [target] = parameters;
const home = process.env.HOME;
const outDir = home + "/Desktop";

if (!home) {
    console.error("Error: HOME environment variable is not set.");
    process.exit(1);
}

// Check if yt-dlp is installed
const check = spawnSync("yt-dlp", ["--version"], { stdio: "inherit" });

if (check.error || check.status !== 0) {
    console.error("Error: yt-dlp is not installed or not in PATH.");
    console.error("Install with: brew install yt-dlp");
    process.exit(1);
}

function downloadMp3(outDir, url) {
    const args = [
        "--no-playlist",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "-o",
        outDir + "/%(title)s.%(ext)s",
        url,
    ];

    const run = spawnSync("yt-dlp", args, { stdio: "inherit" });
    return run.status ?? 1;
}

function getFileLines(filePath) {
    const data = fs.readFileSync(filePath, "utf-8");
    const lines = data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    return lines;
}

function downloadTxt(outDir, filePath) {
    const lines = getFileLines(filePath);

    let hadError = false;

    for (const url of lines) {
        console.log(`Downloading: ${url}`);
        const status = downloadMp3(outDir, url);
        if (status !== 0) {
            console.error(`Failed to download: ${url}`);
            hadError = true;
        }
    }
    return hadError ? 1 : 0;
}

function downloadTsv(outDir, filePath) {
    const existingFiles = fs.readdirSync(outDir, { encoding: "utf-8" });

    function nameMatches(name) {
        return existingFiles.filter((file) => file.includes(name));
    }

    const lines = getFileLines(filePath);
    const name_url = lines.map((line) => line.split("\t"));

    let hadError = false;

    for (const [name, url] of name_url) {
        if (!name || !url) {
            console.error(`Invalid line: ${name}\t${url}`);
            continue;
        }

        const matches = nameMatches(name);
        if (matches.length) {
            console.log(`Skipping: ${name} already matches ${matches.join(", ")}`);
            continue;
        }

        console.log(`Downloading: ${name} from ${url}`);
        const status = downloadMp3(outDir, url);
        if (status !== 0) {
            console.error(`Failed to download: ${name} from ${url}`);
            hadError = true;
        }
    }

    return hadError ? 1 : 0;
}

let status = 0;
if (target.endsWith(".tsv")) {
    status = downloadTsv(outDir, target);
} else if (target.endsWith(".txt")) {
    status = downloadTxt(outDir, target);
} else {
    status = downloadMp3(outDir, target);
    if (status !== 0) {
        console.error(`Failed to download: ${target}`);
    }
}

if (status !== 0) {
    process.exit(1);
}
