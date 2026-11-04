// Cross-platform entry point for scheduled tasks.
//
// Use a different scheduler depending on the platform.
// - Windows - Task Scheduler
// - Linux - cron
// - macOS - launchd
//
// --setup: Setup a scheduler entry to invoke the task if not already present.
// --run: Run configured commands and save output to the configured log folder.

// Logs are kept in the configured log folder to help debug task execution.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { parseArgs } = require("node:util");

const { getConfig } = require("./lib/getConfig");
const { expandPercentEnvVariables } = require("./lib/expandPercentEnvVariables");

/**
 * @typedef {object} Config
 * @property {string} [logFolder]
 * @property {{name: string, schedule: string, command: string}[]} tasks
 */

/**
 *
 * @param {Config} previous
 * @param {Config} current
 * @returns {Config} The merged configuration object.
 */
function reduceConfig(previous, current) {
    // tasks from both previous and current configurations are merged into a single array.
    const tasks = [...(previous.tasks || []), ...(current.tasks || [])];

    const logFolder = current.logFolder || previous.logFolder;
    return {
        ...previous,
        ...current,
        tasks,
        logFolder,
    };
}

/** @type {Config} */
const config = getConfig(__dirname, "scheduled-task", { reduceConfig });
if (!config.logFolder) {
    console.error("logFolder is not specified in the configuration. It must be set to an existing folder path.");
    process.exit(1);
}

const logFolder = expandPercentEnvVariables(config.logFolder);

if (!fs.existsSync(logFolder)) {
    console.error(`Log folder does not exist: ${logFolder}`);
    process.exit(1);
}

const args = parseArgs({
    options: {
        run: { type: "boolean" },
        setup: { type: "boolean" },
    },
});
console.log("Parsed arguments:", args);

const command = [args.values.run ? "run" : false, args.values.setup ? "setup" : false].filter(Boolean);

if (command.length !== 1) {
    console.error("You must specify exactly one command: either --run or --setup");
    process.exit(1);
}

const selectedCommand = command[0];

if (selectedCommand === "setup") {
    if (process.platform === "darwin") {
        commandSetupMac();
    } else {
        console.error("Setup is only supported on macOS.");
        process.exit(1);
    }
} else if (selectedCommand === "run") {
    commandRun();
}

function getTimeStampEntries() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hourCycle: "h23",
        timeZoneName: "short",
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

    return values;
}

function getTimeStamp(values) {
    const timestamp = `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}.${values.fractionalSecond} ${values.timeZoneName}`;

    return timestamp;
}

function getTimeStampFileName(values) {
    const timestamp = `${values.year}-${values.month}-${values.day}_${values.hour}-${values.minute}-${values.second}-${values.fractionalSecond}`;

    return timestamp;
}

function commandRun() {
    console.log("Running scheduled tasks...");
    // Pull each scheduled task from the configuration and execute its command.
    for (const task of config.tasks) {
        console.log(`Task: ${task.name}`);

        const values = getTimeStampEntries();

        const logName = `${task.name}_${getTimeStampFileName(values)}.log`;
        // Ensure log
        const logPath = path.join(logFolder, logName);
        console.log(`Log path:`, logPath);

        fs.writeFileSync(
            logPath,
            `Task: ${task.name}
Timestamp: ${getTimeStamp(values)}

`
        );

        // Execute the task command and capture its output.
        try {
            const result = spawnSync(task.command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
            if (result.stdout) {
                console.log("\n" + result.stdout.toString());
            }
            fs.writeFileSync(logPath, result.stdout.toString("utf8"), { flag: "a" });
        } catch (error) {
            console.error(`Error executing task ${task.name}:`, error);
        }
    }
}

function commandSetupMac() {
    const taskName = "daily22";
    const taskNameFull = `com.user.tools.${taskName}`;
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${taskNameFull}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>-lic</string>
        <string>t scheduled-task -- --run</string>
    </array>

    <!-- Run every day at 22:00 -->
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>22</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <!-- Catch up on missed runs if the Mac was sleeping -->
    <key>WakeFromSleep</key>
    <true/>

    <!-- Standard output and error logs -->
    <key>StandardOutPath</key>
    <string>${logFolder}/tools.${taskNameFull}.out.log</string>
    <key>StandardErrorPath</key>
    <string>${logFolder}/tools.${taskNameFull}.err.log</string>
</dict>
</plist>
`;

    // Where to write plist file for the user?
    const plistFileName = `com.user.tools.${taskName}.plist`;

    const plistPath = path.join(process.env.HOME, "Library", "LaunchAgents", `com.user.tools.${taskName}.plist`);
    fs.writeFileSync(plistPath, plistContent);

    console.log("Unload old property list if loaded");
    console.log(`launchctl bootout gui/$(id -u) ${plistPath}`);
    console.log("");
    console.log("Load the new property list into your active user session domain");
    console.log(`launchctl bootstrap gui/$(id -u) ${plistPath}`);
    console.log("");
    console.log("Check job is registered:");
    console.log(`launchctl list | grep ${taskNameFull}`);
    console.log("");
    console.log("Manually run the job:");
    console.log(`launchctl kickstart -k gui/$(id -u)/com.user.tools.${taskName}`);
}
