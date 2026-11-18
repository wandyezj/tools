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
const { spawnSync, execSync } = require("node:child_process");
const { parseArgs } = require("node:util");
const { userInfo } = require("node:os");

const { getConfig } = require("./lib/getConfig");
const { expandPercentEnvVariables } = require("./lib/expandPercentEnvVariables");
const { ensureDirectoryExists } = require("./lib/ensureDirectoryExists");
const { clearDirectory } = require("./lib/clearDirectory");
const { findDuplicates } = require("./lib/findDuplicates");
const { isPlainObject } = require("./lib/isPlainObject");
const { getTimeStampEntries, getTimeStamp, getTimeStampFileName } = require("./lib/getTimeStamp.ts");

const { platformName } = require("./lib/platform");

const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * @typedef {"monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday"} Weekday
 */

// Schedules
// - daily - every day at a specific hour
// - weekday - a specific weekday at a specific hour
// - weekdays - multiple weekdays at a specific hour

/**
 * @typedef {{type: "daily", hour: number}|{type:"weekday", weekday: Weekday, hour: number}|{type: "weekdays", weekdays: Weekday[], hour: number}} Schedule
 */

/**
 * @typedef {object} Trigger
 * @property {string} name
 * @property {Schedule} schedule
 */

/**
 * @typedef {object} Task
 * @property {string} name
 * @property {string | string[] | undefined} trigger
 * @property {string} command
 */

/**
 * Configuration object for the scheduled task system.
 * Contains the log folder path, triggers, and tasks for the scheduled task system.
 * task names and trigger names must be unique.
 * The log folder must exist and be accessible.
 *
 * @typedef {object} Config
 * @property {string} [logFolder]
 * @property {Trigger[]} triggers
 * @property {Task[]} tasks
 */

/**
 *
 * @param {Config} previous
 * @param {Config} current
 * @returns {Config} The merged configuration object.
 */
function reduceConfig(previous, current) {
    // tasks from both previous and current configurations are merged into a single array.
    const triggers = [...(previous.triggers || []), ...(current.triggers || [])];
    const tasks = [...(previous.tasks || []), ...(current.tasks || [])];

    const logFolder = current.logFolder || previous.logFolder;
    return {
        ...previous,
        ...current,
        triggers,
        tasks,
        logFolder,
    };
}

/** @type {Config} */
const config = getConfig(__dirname, "scheduled-task", { reduceConfig });
checkConfig(config);

/**
 *
 * @param {Config} config
 */
function checkConfig(config) {
    let issue = false;
    if (!config.logFolder) {
        console.error("logFolder is not specified in the configuration. It must be set to an existing folder path.");
        issue = true;
    }

    // validate all task names are unique
    const duplicateTaskNames = findDuplicates(config.tasks.map((task) => task.name));
    if (duplicateTaskNames.length > 0) {
        const duplicateLines = duplicateTaskNames.map(({ name, indices }) => `  ${name}: [${indices.join(", ")}]`);
        console.log(`Duplicate task names found at indices:\n${duplicateLines.join("\n")}`);
        issue = true;
    }

    // validate all trigger names are unique
    const duplicateTriggerNames = findDuplicates(config.triggers.map((trigger) => trigger.name));
    if (duplicateTriggerNames.length > 0) {
        const duplicateLines = duplicateTriggerNames.map(({ name, indices }) => `  ${name}: [${indices.join(", ")}]`);
        console.log(`Duplicate trigger names found at indices:\n${duplicateLines.join("\n")}`);
        issue = true;
    }

    // Verify trigger values and schedules for each trigger
    for (const [index, trigger] of config.triggers.entries()) {
        let id = `Trigger at index ${index}`;
        if (!trigger.name) {
            console.error(`${id} is missing a name.`);
            issue = true;
        }

        id = `Trigger at index ${index} "${trigger.name}":`;
        if (!trigger.schedule) {
            console.error(`${id} is missing a schedule.`);
            issue = true;
            continue;
        }

        // Validate the schedule format (basic check)
        if (!isPlainObject(trigger.schedule)) {
            console.error(`${id} has an invalid schedule format.`);
            issue = true;
            continue;
        }

        const { schedule } = trigger;
        if (!Number.isInteger(schedule.hour) || schedule.hour < 0 || schedule.hour > 23) {
            console.error(`${id} schedule.hour must be an integer from 0 to 23.`);
            issue = true;
        }

        switch (schedule.type) {
            case "daily":
                break;
            case "weekday":
                if (typeof schedule.weekday !== "string") {
                    console.error(`${id} schedule.weekday must be a string. Received ${typeof schedule.weekday}.`);
                    issue = true;
                    break;
                }
                if (!weekdayNames.includes(schedule.weekday)) {
                    console.error(
                        `${id} schedule.weekday has invalid value ${schedule.weekday}. Expected one of: ${weekdayNames.join(", ")}.`
                    );
                    issue = true;
                }
                break;
            case "weekdays":
                // Ensure the weekdays is an array.
                if (!Array.isArray(schedule.weekdays)) {
                    console.error(`${id} schedule.weekdays must be an array. Received ${schedule.weekdays}.`);
                    issue = true;
                    break;
                }
                // Require that the weekdays array is not empty.
                if (schedule.weekdays.length === 0) {
                    console.error(`${id} schedule.weekdays must contain at least one weekday.`);
                    issue = true;
                    break;
                }

                // Validate each weekday in the array
                for (const [weekdayIndex, weekday] of schedule.weekdays.entries()) {
                    if (!weekdayNames.includes(weekday)) {
                        console.error(
                            `${id} schedule.weekdays[${weekdayIndex}] has invalid value ${weekday}. Expected one of: [${weekdayNames.join(", ")}].`
                        );
                        issue = true;
                    }
                }
                // No duplicate weekdays allowed
                for (const { name, indices } of findDuplicates(schedule.weekdays)) {
                    console.error(
                        `${id} schedule.weekdays has duplicate value ${name} at indices [${indices.join(", ")}].`
                    );
                    issue = true;
                }
                break;
            default:
                console.error(`${id} schedule.type must be "daily", "weekday", or "weekdays".`);
                issue = true;
        }
    }

    // Show all issues and exit if any issues were found.
    if (issue) {
        process.exit(1);
    }
}

const logFolderBase = expandPercentEnvVariables(config.logFolder);

if (!fs.existsSync(logFolderBase)) {
    console.error(`Log folder does not exist: ${logFolderBase}`);
    process.exit(1);
}

const args = parseArgs({
    options: {
        run: { type: "boolean" },
        setup: { type: "boolean" },
        trigger: { type: "string" },
    },
});
// console.log("Parsed arguments:", args);

const command = [args.values.run ? "run" : false, args.values.setup ? "setup" : false].filter(Boolean);

if (command.length !== 1) {
    console.error("You must specify exactly one command: either --run or --setup");
    process.exit(1);
}

const selectedCommand = command[0];

if (selectedCommand === "setup") {
    switch (platformName) {
        case "mac":
            commandSetupMac(config.triggers, logFolderBase);
            break;
        case "windows":
            commandSetupWindows();
            break;
        default:
            console.error("Setup is only supported on macOS and Windows.");
            process.exit(1);
    }
} else if (selectedCommand === "run") {
    const triggerName = args.values.trigger;
    commandRun(triggerName);
}

/**
 * Should this task be executed for the given trigger name?
 * @param {Task} task
 * @param {string} triggerName
 * @returns {boolean} True if the task should be executed for the given trigger name, false otherwise.
 */
function taskHasTrigger(task, triggerName) {
    const { trigger } = task;
    if (typeof trigger === "undefined") {
        // If the task has no trigger specified, it should run for all triggers.
        return true;
    }

    if (typeof trigger === "string") {
        return triggerName === trigger;
    }

    if (Array.isArray(trigger)) {
        return trigger.includes(triggerName);
    }
    return false;
}

/**
 *
 * @param {string} triggerName The name of the trigger for which to run the tasks.
 */
function commandRun(triggerName) {
    const { logFolder } = getCommonTaskConfig({ taskName: triggerName, logFolderBase });
    ensureDirectoryExists(logFolder);

    console.log("Running scheduled tasks...");
    // Pull each scheduled task from the configuration and execute its command.
    for (const task of config.tasks) {
        console.log(`Task: ${task.name}`);

        const hasTrigger = taskHasTrigger(task, triggerName);
        if (!hasTrigger) {
            console.log(`Skip task ${task.name} as it does not match the trigger: ${triggerName}`);
            continue;
        }

        const values = getTimeStampEntries();

        const logName = `${getTimeStampFileName(values)}_${task.name}.log`;
        // Ensure log
        const logPath = path.join(logFolder, logName);
        console.log(`Log path:`, logPath);

        fs.writeFileSync(
            logPath,
            `Task: ${task.name}
Trigger: ${triggerName}
Timestamp: ${getTimeStamp(values)}

`
        );

        // Execute the task command and capture its output.
        try {
            const result = spawnSync(task.command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
            // For Debugging - generally don't write this out to avoid cluttering the log file.
            // if (result.stdout) {
            //     console.log("\n" + result.stdout.toString());
            // }
            fs.writeFileSync(logPath, result.stdout.toString("utf8"), { flag: "a" });
        } catch (error) {
            console.error(`Error executing task ${task.name}:`, error);
        }
    }
}

/**
 *
 * @param {{ taskName: string, logFolderBase: string }} param0
 * @returns
 */
function getCommonTaskConfig({ taskName, logFolderBase }) {
    const taskNameBase = `user.tools.`;
    const taskNameFull = `${taskNameBase}${taskName}`;

    const logFolder = path.resolve(path.join(logFolderBase, taskNameFull));
    const filepathOut = path.resolve(path.join(logFolder, `out.log`));
    const filepathError = path.resolve(path.join(logFolder, `err.log`));

    return {
        taskNameBase,
        taskName,
        taskNameFull,
        logFolder,
        filepathOut,
        filepathError,
        command: `t scheduled-task -- --run --trigger ${taskName}`,
    };
}

function getPlistDirectory() {
    return path.join(process.env.HOME, "Library", "LaunchAgents");
}

/**
 * @param {Trigger} trigger The name of the trigger to create for macOS.
 * @param {string} logFolderBase The base folder for storing log files.
 */
function createMacTrigger(trigger, logFolderBase) {
    const { name, schedule } = trigger;
    const { taskName, taskNameFull, filepathOut, filepathError, command } = getCommonTaskConfig({
        logFolderBase,
        taskName: name,
    });

    const time = `${String(schedule.hour).padStart(2, "0")}:00`;
    let scheduleDescription;
    let calendarInterval;
    switch (schedule.type) {
        case "daily":
            scheduleDescription = `Run every day at ${time}`;
            calendarInterval = `    <dict>
        <key>Hour</key>
        <integer>${schedule.hour}</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>`;
            break;
        case "weekday": {
            scheduleDescription = `Run every ${schedule.weekday} at ${time}`;
            calendarInterval = `    <dict>
        <key>Hour</key>
        <integer>${schedule.hour}</integer>
        <key>Minute</key>
        <integer>0</integer>
        <key>Weekday</key>
        <integer>${weekdayNames.indexOf(schedule.weekday)}</integer>
    </dict>`;
            break;
        }
        case "weekdays": {
            scheduleDescription = `Run on ${schedule.weekdays.join(", ")} at ${time}`;
            const intervals = schedule.weekdays.map(
                (weekday) => `    <dict>
        <key>Hour</key>
        <integer>${schedule.hour}</integer>
        <key>Minute</key>
        <integer>0</integer>
        <key>Weekday</key>
        <integer>${weekdayNames.indexOf(weekday)}</integer>
    </dict>`
            );
            calendarInterval = `    <array>\n${intervals.join("\n")}\n    </array>`;
            break;
        }
        default:
            throw new Error(`Unsupported schedule type: ${schedule.type}`);
    }

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
        <string>${command}</string>
    </array>

    <!-- ${scheduleDescription} -->
    <key>StartCalendarInterval</key>
${calendarInterval}

    <!-- Catch up on missed runs if the Mac was sleeping -->
    <key>WakeFromSleep</key>
    <true/>

    <!-- Standard output and error logs -->
    <key>StandardOutPath</key>
    <string>${filepathOut}</string>
    <key>StandardErrorPath</key>
    <string>${filepathError}</string>
</dict>
</plist>
`;

    // Where to write plist file for the user?
    const plistFileName = `${taskNameFull}.plist`;

    const plistPath = path.join(getPlistDirectory(), plistFileName);

    // Run in Sequence to ensure proper setup
    fs.writeFileSync(plistPath, plistContent);

    console.log(`
Some commands need to be run as root.

Unload - old property list if loaded
launchctl bootout gui/$(id -u) ${plistPath}

Load - the new property list into your active user session domain
launchctl bootstrap gui/$(id -u) ${plistPath}

Check - job is registered:
launchctl list | grep ${taskNameFull}

Manually run the job:
launchctl kickstart -k gui/$(id -u)/${taskNameFull}

`);
}

/**
 *
 * @param {Trigger[]} triggers
 * @param {string} logFolderBase
 */
function commandSetupMac(triggers, logFolderBase) {
    // Cleat log folder
    const { logFolder, taskNameBase } = getCommonTaskConfig({
        logFolderBase,
    });
    clearDirectory(logFolder);
    ensureDirectoryExists(logFolder);

    // Clear any existing triggers prefixed with the task name base.

    // (1) read all registered task names
    const existingTasks = execSync("launchctl list", { encoding: "utf-8" })
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith(taskNameBase));
    console.log(`Existing tasks to remove:\n\t${existingTasks.join("\n\t")}`);

    // (2) remove each registered task
    existingTasks.forEach((task) => {
        execSync(`launchctl bootout gui/$(id -u) ${task}`);
    });

    // (3) Remove all matching plist files
    existingTasks.forEach((task) => {
        const plistPath = path.join(getPlistDirectory(), `${task}.plist`);
        if (fs.existsSync(plistPath)) {
            fs.unlinkSync(plistPath);
        }
    });

    // Create new triggers.
    triggers.forEach((trigger) => {
        createMacTrigger(trigger, logFolderBase);
    });
}

function commandSetupWindows() {
    const { filepathOut, filepathError, logFolder, taskNameFull, command } = getCommonTaskConfig({
        logFolderBase,
    });
    clearDirectory(logFolder);
    ensureDirectoryExists(logFolder);

    const taskPath = path.join(logFolder, `${taskNameFull}.xml`);

    const username = userInfo().username;
    const userId = process.env.USERDOMAIN ? `${process.env.USERDOMAIN}\\${username}` : username;
    const escapeXml = (value) =>
        value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const argumentsValue = `/d /s /v:off /c "${command} 1>"${filepathOut}" 2>"${filepathError}""`;

    const runAsAdmin = false; // Set to true if the task should run with elevated privileges

    const taskContent = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
    <Triggers>
        <CalendarTrigger>
            <StartBoundary>2000-01-01T22:00:00</StartBoundary>
            <Enabled>true</Enabled>
            <ScheduleByDay>
                <DaysInterval>1</DaysInterval>
            </ScheduleByDay>
        </CalendarTrigger>
    </Triggers>
    <Principals>
        <Principal id="Author">
            <UserId>${escapeXml(userId)}</UserId>
            <LogonType>InteractiveToken</LogonType>
            <RunLevel>${runAsAdmin ? "HighestAvailable" : "LeastPrivilege"}</RunLevel>
        </Principal>
    </Principals>
    <Settings>
        <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
        <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
        <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
        <StartWhenAvailable>true</StartWhenAvailable>
        <WakeToRun>true</WakeToRun>
        <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    </Settings>
    <Actions Context="Author">
        <Exec>
            <Command>${escapeXml(process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe")}</Command>
            <Arguments>${escapeXml(argumentsValue)}</Arguments>
            <WorkingDirectory>${escapeXml(__dirname)}</WorkingDirectory>
        </Exec>
    </Actions>
</Task>
`;

    fs.writeFileSync(taskPath, "\uFEFF" + taskContent, "utf16le");

    registerTaskWindows(taskNameFull, taskPath);
    checkTaskWindows(taskNameFull);

    console.log(`
Register or replace the task for the current user (run in Command Prompt):
schtasks /Create /TN "${taskNameFull}" /XML "${taskPath}" /F

Check job is registered:
schtasks /Query /TN "${taskNameFull}" /V /FO LIST

Manually run the job:
schtasks /Run /TN "${taskNameFull}"
`);
}

function registerTaskWindows(taskName, taskPath) {
    console.log(runCommand("schtasks.exe", ["/Create", "/TN", taskName, "/XML", taskPath, "/F"]));
}

function checkTaskWindows(taskName) {
    console.log(runCommand("schtasks.exe", ["/Query", "/TN", taskName, "/V", "/FO", "LIST"]));
}

function runCommand(command, args) {
    const result = spawnSync(command, args, { encoding: "utf8", timeout: 15000 });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
    }
    return result.stdout;
}
