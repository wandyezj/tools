#!/usr/bin/env node

const { parseArgs } = require("node:util");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const helpText = `Usage: node extract-video-audio.js <folder>

Scan the folder for MP4 files and extract each one's audio to a same-basename MP3
in that folder. Existing MP3 files are left untouched.

Prerequisites:

Install ffmpeg:

Mac:

    brew install ffmpeg

Verify the installation with:

    ffmpeg -version
`;

const { values, positionals } = parseArgs({
    options: {
        help: {
            type: "boolean",
            short: "h",
        },
    },
    allowPositionals: true,
});

if (values.help) {
    console.log(helpText);
    process.exit(0);
}

const [sourceDirectory] = positionals;

if (!sourceDirectory) {
    console.error("Error: No source directory specified.");
    process.exit(1);
}

const sourceDirectoryPath = path.resolve(sourceDirectory);

if (!fs.existsSync(sourceDirectoryPath) || !fs.statSync(sourceDirectoryPath).isDirectory()) {
    console.error(`Error: Folder does not exist: ${sourceDirectoryPath}`);
    process.exit(1);
}

const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });

if (ffmpegCheck.error || ffmpegCheck.status !== 0) {
    console.error("Error: ffmpeg is not installed or not in PATH.");
    console.error("On macOS, install with: brew install ffmpeg");
    process.exit(1);
}

const videoFiles = fs
    .readdirSync(sourceDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".mp4")
    .map((entry) => entry.name);

if (videoFiles.length === 0) {
    console.log(`No MP4 files found in: ${sourceDirectoryPath}`);
    process.exit(0);
}

const summary = [];

for (const videoFile of videoFiles) {
    const inputPath = path.join(sourceDirectoryPath, videoFile);
    const outputPath = path.join(sourceDirectoryPath, `${path.basename(videoFile, path.extname(videoFile))}.mp3`);

    console.log(`Extract audio: ${videoFile}`);
    if (fs.existsSync(outputPath)) {
        console.log(`    Skipped existing file: ${outputPath}`);
        continue;
    }

    const result = spawnSync(
        "ffmpeg",
        [
            "-hide_banner",
            "-loglevel",
            "error",
            "-n",
            "-i",
            inputPath,
            "-vn",
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "2",
            outputPath,
        ],
        { stdio: "inherit" }
    );

    const success = !result.error && result.status === 0;
    summary.push({ videoFile, success });

    if (!success) {
        console.error(`Failed to extract audio from: ${videoFile}`);
    }
}

console.log("Summary:");
for (const { videoFile, success } of summary) {
    console.log(`[${success ? " ok " : "FAIL"}] ${videoFile}`);
}

const successCount = summary.filter(({ success }) => success).length;
console.log(`success: ${successCount} / ${summary.length}`);

const failed = summary.some(({ success }) => !success);
process.exit(failed ? 1 : 0);
