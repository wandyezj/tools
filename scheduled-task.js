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
const { userInfo } = require("node:os");

const { getConfig } = require("./lib/getConfig");
const { expandPercentEnvVariables } = require("./lib/expandPercentEnvVariables");
const { ensureDirectoryExists } = require("./lib/ensureDirectoryExists");
const { clearDirectory } = require("./lib/clearDirectory");

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

const logFolderBase = expandPercentEnvVariables(config.logFolder);

if (!fs.existsSync(logFolderBase)) {
    console.error(`Log folder does not exist: ${logFolderBase}`);
    process.exit(1);
}

const args = parseArgs({
    options: {
        run: { type: "boolean" },
        setup: { type: "boolean" },
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
    const platform = process.platform;
    if (platform === "darwin") {
        commandSetupMac();
    } else if (platform === "win32") {
        commandSetupWindows();
    } else {
        console.error("Setup is only supported on macOS and Windows.");
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
    const timestamp = `${values.year}-${values.month}-${values.day}_${values.hour}${values.minute}_${values.second}${values.fractionalSecond}`;

    return timestamp;
}

function commandRun() {
    const { taskNameFull, logFolder } = getCommonTaskConfig({ logFolderBase });
    ensureDirectoryExists(logFolder);

    console.log("Running scheduled tasks...");
    // Pull each scheduled task from the configuration and execute its command.
    for (const task of config.tasks) {
        console.log(`Task: ${task.name}`);

        const values = getTimeStampEntries();

        const logName = `${getTimeStampFileName(values)}_${task.name}.log`;
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

function getCommonTaskConfig({ logFolderBase }) {
    const taskName = "daily22";
    const taskNameFull = `user.tools.${taskName}`;

    const logFolder = path.resolve(path.join(logFolderBase, taskNameFull));
    const filepathOut = path.resolve(path.join(logFolder, `out.log`));
    const filepathError = path.resolve(path.join(logFolder, `err.log`));
    return {
        taskName,
        taskNameFull,
        logFolder,
        filepathOut,
        filepathError,
        command: `t scheduled-task -- --run`,
    };
}

function commandSetupMac() {
    const { taskName, taskNameFull, logFolder, filepathOut, filepathError, command } = getCommonTaskConfig({
        logFolderBase,
    });
    clearDirectory(logFolder);
    ensureDirectoryExists(logFolder);

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
    <string>${filepathOut}</string>
    <key>StandardErrorPath</key>
    <string>${filepathError}</string>
</dict>
</plist>
`;

    // Where to write plist file for the user?
    const plistFileName = `com.user.tools.${taskName}.plist`;

    const plistPath = path.join(process.env.HOME, "Library", "LaunchAgents", plistFileName);
    fs.writeFileSync(plistPath, plistContent);

    console.log(`
Unload old property list if loaded
launchctl bootout gui/$(id -u) ${plistPath}

Load the new property list into your active user session domain
launchctl bootstrap gui/$(id -u) ${plistPath}

Check job is registered:
launchctl list | grep ${taskNameFull}

Manually run the job:
launchctl kickstart -k gui/$(id -u)/com.user.tools.${taskName}`);
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
            <RunLevel>LeastPrivilege</RunLevel>
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
