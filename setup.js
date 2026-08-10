// Setup script

const { execSync } = require("node:child_process");
const path = require("node:path");

const os = require("os");
const platform = os.type();

const isWindows = platform === "Windows_NT";
const isMac = platform === "Darwin";
const isLinux = platform === "Linux";

/**
 * Checks if a registry key exists and matches an expected value.
 *
 * @param {string} key - The registry path.
 * @param {string} value - The name of the value entry.
 * @param {string | undefined} expectedData - The expected data (optional).
 * @returns {boolean} - Returns true if the key exists and matches, false otherwise.
 */
function windowsHasRegValue(key, value, expectedData) {
    try {
        const command = `reg query "${key}" /v "${value}"`;

        // stdio: 'ignore' suppresses error logs in the console if the key doesn't exist
        const stdout = execSync(command, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });

        // Parse the output lines to locate the target value entry
        const lines = stdout.split(/\r?\n/);
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.toLowerCase().startsWith(value.toLowerCase())) {
                const parts = trimmedLine.split(/\s+/);
                const actualData = parts[parts.length - 1]; // e.g., '0x0' or '0'

                // Compare values (supports both decimal and hex matching)
                if (
                    expectedData !== undefined &&
                    (actualData.toLowerCase() === expectedData.toLowerCase() ||
                        parseInt(actualData, 16) === parseInt(expectedData))
                ) {
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

function windowsSetRegKey({ key, value, type, data }) {
    execSync(`reg add "${key}" /v "${value}" /t "${type}" /d "${data}" /f`);
}

function windowsRegValueTestAndSet({ key, value, type, data }) {
    const hasValue = () => windowsHasRegValue(key, value, data);
    console.log(`Registry key "${key}" "${value}" "${data}"`);
    if (hasValue()) {
        console.log(`present.`);
        return;
    }

    windowsSetRegKey({ key, value, type, data });

    if (hasValue()) {
        console.log(`set success.`);
    } else {
        console.log(`set FAIL`);
    }
}

/**
 * Checks if a system-level environment variable is already set.
 * @param {string} name - The name of the environment variable to check.
 * @returns {boolean} True if the system variable exists, false otherwise.
 */
function windowsIsSystemEnvVarSet(name) {
    return windowsHasRegValue(String.raw`HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment`, name);
}

function windowsSetSystemEnvVar({ key, value }) {
    try {
        execSync(`setx /M ${key} "${value}"`, { stdio: "inherit" });
    } catch (error) {
        console.log(`[ERROR] Failed to set system environment variable ${key}:`, error);
    }
}

function windowsTestAndSetEnvVar({ key, value }) {
    const hasKey = () => windowsIsSystemEnvVarSet(key);
    console.log(`Env Var "${key}"`);

    if (hasKey()) {
        console.log("present.");
        return;
    }

    windowsSetSystemEnvVar({ key, value });

    if (hasKey()) {
        console.log(`set success.`);
    } else {
        console.log(`set FAIL`);
    }
}

function executeElevated(command) {
    if (isWindows) {
        const release = os.release(); // e.g., "10.0.26100"
        const buildNumber = parseInt(release.split(".")[2], 10);

        // Windows 11 Build 26100+ (Version 24H2) supports native sudo
        if (buildNumber >= 26100) {
            try {
                console.log("Windows 11 (24H2+) detected. Using sudo.");
                // Prepending 'sudo' triggers the native UAC prompt inline or in a new window
                execSync(`sudo ${command}`, { stdio: "inherit" });
                return;
            } catch (error) {
                console.log("[WARNING] Native sudo execution failed or is disabled in settings. ");
            }
        }
    }

    // Fallback for Windows 10 or older Windows 11 builds where sudo isn't available
    try {
        execSync(command, { stdio: "inherit" });
    } catch (error) {
        console.log("[ERROR] Command execution failed:", error);
    }
}

/**
 * Checks if the current Node process is running as Administrator on Windows.
 * @returns {boolean} - Returns true if elevated, false otherwise.
 */
function windowsIsAdmin() {
    try {
        // 'net session' exits with 0 if running as admin, or throws an error if not
        execSync("net session", { stdio: "ignore" });
        return true;
    } catch (error) {
        return false;
    }
}

function isAdmin() {
    if (isWindows) {
        return windowsIsAdmin();
    }

    if (isMac || isLinux) {
        return process.getuid() === 0;
    }
    return false;
}

function setupWindows() {
    //
    // Set Reg keys
    //

    /**
     * @type {{ key: string; value: string; type: string; data: string; }[]}
     */
    const regValues = [
        // Hide file extensions
        {
            key: String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced`,
            value: "HideFileExt",
            type: "REG_DWORD",
            data: "0",
        },
    ];

    regValues.forEach(windowsRegValueTestAndSet);

    //
    // Set global variables (requires admin)
    //

    if (!isAdmin()) {
        console.log("[ERROR] Administrator privileges are required to set global variables.");
        return;
    }

    /**
     * @type {{ key: string; value: string; }[]}
     */
    const envValues = [
        // Directory for tools
        {
            key: "tools",
            value: __dirname,
        },
        // Tools should be stored in r
        {
            key: "r",
            value: path.normalize(path.join(__dirname, "..")),
        },
    ];

    envValues.forEach(({ key, value }) => {
        console.log(`${key}`);
        windowsTestAndSetEnvVar({ key, value });
    });

    // Add to path
}

if (isWindows) {
    setupWindows();
}
