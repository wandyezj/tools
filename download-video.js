#!/usr/bin/env node

// Download video from YouTube URLs using yt-dlp to the Desktop.

const helpText = `Usage: node download-video.js <YouTube URL> | <Text File> | <TSV File> [options]

- YouTube URL, it will download the video to the Desktop.
- Text File, containing one YouTube URL per line - each url will be downloaded as a video to the Desktop.
- TSV File, containing lines of the format "Name<TAB>URL". Downloads each URL as a video to the Desktop, unless there is already a file containing the name on the Desktop.

Options:

--video - Download the video (default).
--mp4 - Download the video and convert to mp4 (this takes a while)
--mp3 - Download the video audio as mp3.

--playlist - (only applies with --mp3) Download the entire playlist if the URL is a playlist. By default, only the first video will be downloaded.

--out-dir <directory> - Output directory to save the downloaded files. Default is the Desktop.
--ignore-comment-lines - Ignore lines starting with # in text and tsv files.
--use-tsv-name - Use the name from the tsv file as the output filename instead of the video title.

Prerequisites:

Install the latest yt-dlp and ffmpeg and make sure they are in your PATH.

Mac:

    brew install ffmpeg yt-dlp

`;

const { parseArgs } = require("node:util");
const { spawnSync } = require("node:child_process");
const fs = require("fs");

const { values, positionals } = parseArgs({
    options: {
        help: {
            type: "boolean",
            short: "h",
        },
        playlist: {
            type: "boolean",
        },
        ["prefix-uploader"]: {
            type: "boolean",
        },
        video: {
            type: "boolean",
        },
        mp4: {
            type: "boolean",
        },
        mp3: {
            type: "boolean",
        },
        ["out-dir"]: {
            type: "string",
        },
        ["ignore-comment-lines"]: {
            type: "boolean",
        },
        ["use-tsv-name"]: {
            type: "boolean",
        },
    },
    allowPositionals: true,
});

const {
    help,
    mp4,
    mp3,
    video,
    playlist,
    ["prefix-uploader"]: prefixUploader,
    ["out-dir"]: outDirOption,
    ["ignore-comment-lines"]: ignoreCommentLines,
    ["use-tsv-name"]: useTsvName,
} = values;

if (playlist && !mp3) {
    console.error("Error: --playlist option only applies with --mp3.");
    process.exit(1);
}

const downloadModeVideo = "video";
const downloadModeMp4 = "mp4";
const downloadModeMp3 = "mp3";

const modeMap = [
    [video, downloadModeVideo],
    [mp4, downloadModeMp4],
    [mp3, downloadModeMp3],
].map(([flag, mode]) => {
    return { flag, mode };
});

const selectedMode = modeMap.filter(({ flag }) => flag).map(({ mode }) => mode);

if (selectedMode.length > 1) {
    console.error(`Choose only one of: ${modeMap.map(({ mode }) => `--${mode}`).join(", ")}`);
    process.exit(1);
}

const downloadMode = selectedMode.length === 1 ? selectedMode[0] : downloadModeVideo;

if (help) {
    console.log(helpText);
    process.exit(0);
}

if (positionals.length !== 1) {
    console.error("Invalid usage.");
    console.log(helpText);
    process.exit(1);
}

function getDefaultOutDir() {
    const home = process.env.HOME;
    if (!home) {
        console.error("Error: HOME environment variable is not set.");
        process.exit(1);
    }
    const outDirDefault = home + "/Desktop";
    return outDirDefault;
}

function getOutDirFromOption(outDirOption) {
    if (outDirOption === undefined) {
        return undefined;
    }
    if (!fs.existsSync(outDirOption) || !fs.statSync(outDirOption).isDirectory()) {
        console.error(`Error: Output directory does not exist: ${outDirOption}`);
        process.exit(1);
    }
    return outDirOption;
}

const [target] = positionals;
const outDir = getOutDirFromOption(outDirOption) || getDefaultOutDir();

// Check if yt-dlp is installed
const check = spawnSync("yt-dlp", ["--version"], { stdio: "inherit" });

if (check.error || check.status !== 0) {
    console.error("Error: yt-dlp is not installed or not in PATH.");
    console.error("Install with: brew install yt-dlp");
    process.exit(1);
}

function getOutputFileTemplate(outDir, nameOverride) {
    const baseFilename = nameOverride ? `${nameOverride}.%(ext)s` : "%(title)s.%(ext)s";

    const filenameTemplate = prefixUploader ? `%(uploader)s - ${baseFilename}` : baseFilename;
    const outFile = outDir + "/" + filenameTemplate;
    return outFile;
}

function downloadVideo(outDir, url, nameOverride) {
    const outFile = getOutputFileTemplate(outDir, nameOverride);

    const args = ["-f", "best", "-o", outFile, url];

    const run = spawnSync("yt-dlp", args, { stdio: "inherit" });
    return run.status ?? 1;
}

function downloadMp4(outDir, url, nameOverride) {
    const outFile = getOutputFileTemplate(outDir, nameOverride);

    const args = ["-f", "bv*+ba/b", "--recode-video", "mp4", "-o", outFile, url];

    const run = spawnSync("yt-dlp", args, { stdio: "inherit" });
    return run.status ?? 1;
}

function downloadMp3(outDir, url, nameOverride) {
    //const isPlaylist = url.includes("playlist?") || url.includes("list=");

    const outFile = getOutputFileTemplate(outDir, nameOverride);

    const args = [
        playlist ? "--yes-playlist" : "--no-playlist",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "-o",
        outFile,
        url,
    ];

    const run = spawnSync("yt-dlp", args, { stdio: "inherit" });
    return run.status ?? 1;
}

function getDownloadMode(downloadMode) {
    // undefined extension means it won't match against an existing files extension.
    switch (downloadMode) {
        case downloadModeMp4:
            return { extension: "mp4", download: downloadMp4 };
        case downloadModeMp3:
            return { extension: "mp3", download: downloadMp3 };
        case downloadModeVideo:
            return { extension: undefined, download: downloadVideo };
        default:
            throw new Error(`Invalid download mode: ${downloadMode}`);
    }
}

function getDownloadFunction(downloadMode) {
    const { download } = getDownloadMode(downloadMode);
    return download;
}

function getFileLines(filePath) {
    const data = fs.readFileSync(filePath, "utf-8");
    const lines = data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !(ignoreCommentLines && line.startsWith("#")));

    return lines;
}

function downloadSingle(outDir, url, downloadMode) {
    const download = getDownloadFunction(downloadMode);
    console.log(`Downloading: ${url}`);
    const status = download(outDir, url);
    if (status !== 0) {
        console.error(`Failed to download: ${url}`);
    }
    return status;
}

function downloadTxt(outDir, filePath, downloadMode) {
    const download = getDownloadFunction(downloadMode);

    const lines = getFileLines(filePath);

    let hadError = false;

    for (const url of lines) {
        console.log(`Downloading: ${url}`);
        const status = download(outDir, url);
        if (status !== 0) {
            console.error(`Failed to download: ${url}`);
            hadError = true;
        }
    }
    return hadError ? 1 : 0;
}

/**
 * Remove characters that are not allowed in filenames, to avoid issues when matching against existing files and when saving the downloaded file.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
    // Remove characters that are not allowed in filenames.
    return name.replaceAll(/[\/\\?%*:|"<>]/g, " ");
}

function downloadTsv(outDir, filePath, downloadMode) {
    const { download, extension } = getDownloadMode(downloadMode);

    const existingFiles = fs.readdirSync(outDir, { encoding: "utf-8" });

    function nameMatches(name) {
        // Match if a file contains the name & ends with extension.
        return existingFiles.filter(
            (file) => file.includes(name) && (extension ? file.endsWith(`.${extension}`) : true)
        );
    }

    const lines = getFileLines(filePath);
    const name_url = lines.map((line) => line.split("\t")).map(([name, url]) => [sanitizeFilename(name), url]);

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
        const status = download(outDir, url, useTsvName ? name : undefined);
        if (status !== 0) {
            console.error(`Failed to download: ${name} from ${url}`);
            hadError = true;
        }
    }

    return hadError ? 1 : 0;
}

let status = 0;

// Pick way to download based on target
if (target.endsWith(".tsv")) {
    status = downloadTsv(outDir, target, downloadMode);
} else if (target.endsWith(".txt")) {
    status = downloadTxt(outDir, target, downloadMode);
} else {
    status = downloadSingle(outDir, target, downloadMode);
}

if (status !== 0) {
    process.exit(1);
}
