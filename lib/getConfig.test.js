// @ts-check

import { deepEqual, equal, throws } from "node:assert/strict";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { getConfig, getConfigFilePaths, isValidConfigName } from "./getConfig.js";
import { report, test } from "./test.js";

/**
 * Run a callback with temporary environment variable overrides and restore originals afterward.
 *
 * @param {Record<string, string | undefined>} overrides
 * @param {() => void} callback
 */
function withEnv(overrides, callback) {
    /** @type {Record<string, string | undefined>} */
    const previous = {};
    for (const key of Object.keys(overrides)) {
        previous[key] = process.env[key];
        const value = overrides[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    try {
        callback();
    } finally {
        for (const key of Object.keys(overrides)) {
            const value = previous[key];
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}

/**
 * Run a callback with a temporary directory that is removed afterward.
 *
 * @param {(tempDir: string) => void} callback
 */
function withTempDir(callback) {
    const tempDir = fs.mkdtempSync(path.join(tmpdir(), "tools-get-config-test-"));
    try {
        callback(tempDir);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

/**
 * Write a JSON object to disk, creating parent directories if needed.
 *
 * @param {string} filePath
 * @param {unknown} data
 */
function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
}

test("isValidConfigName accepts lowercase-leading names with letters, digits, and hyphens", () => {
    equal(isValidConfigName("a"), true);
    equal(isValidConfigName("alias"), true);
    equal(isValidConfigName("scheduledtask"), true);
    equal(isValidConfigName("config123"), true);
    equal(isValidConfigName("abc123"), true);
    equal(isValidConfigName("scheduled-task"), true);
    equal(isValidConfigName("git-repository-manager"), true);
    equal(isValidConfigName("config-123"), true);
    equal(isValidConfigName("config-"), true);
});

test("isValidConfigName rejects invalid first characters, uppercase letters, consecutive hyphens, and unsupported characters", () => {
    equal(isValidConfigName(""), false);
    equal(isValidConfigName("A"), false);
    equal(isValidConfigName("Alias"), false);
    equal(isValidConfigName("scheduledTask"), false);
    equal(isValidConfigName("aBC123"), false);
    equal(isValidConfigName("scheduled-Task"), false);
    equal(isValidConfigName("config--name"), false);
    equal(isValidConfigName("config--"), false);
    equal(isValidConfigName("config---name"), false);
    equal(isValidConfigName("1Config"), false);
    equal(isValidConfigName("-config"), false);
    equal(isValidConfigName("scheduled_Task"), false);
    equal(isValidConfigName("config.json"), false);
    equal(isValidConfigName("../config"), false);
    equal(isValidConfigName("config Name"), false);
});

test("getConfigFilePaths throws on invalid config names", () => {
    throws(() => getConfigFilePaths("/base", ""), /Invalid configuration name/);
    throws(() => getConfigFilePaths("/base", "Alias"), /Invalid configuration name/);
    throws(() => getConfigFilePaths("/base", "scheduledTask"), /Invalid configuration name/);
    throws(() => getConfigFilePaths("/base", "config--name"), /Invalid configuration name/);
    throws(() => getConfigFilePaths("/base", "invalid_name"), /Invalid configuration name/);
    throws(() => getConfigFilePaths("/base", "-config"), /Invalid configuration name/);
    throws(() => getConfigFilePaths("/base", "../Traversal"), /Invalid configuration name/);
});

test("getConfigFilePaths preserves hyphens in configuration filenames", () => {
    equal(
        getConfigFilePaths("/base", "git-repository-manager")[0],
        path.join("/base", "git-repository-manager.config.json")
    );
});

test("getConfigFilePaths preserves environment placeholders when env vars are unset", () => {
    withEnv({ USERPROFILE: undefined, OneDrive: undefined, r: undefined }, () => {
        const baseDir = path.join("/workspace", "app");
        const result = getConfigFilePaths(baseDir, "sample");

        deepEqual(result, [
            path.join(baseDir, "sample.config.json"),
            path.join("%USERPROFILE%", "Desktop", "tools.sample.config.json"),
            path.join("%USERPROFILE%", "Desktop", "tools", "tools.sample.config.json"),
            path.join("%USERPROFILE%", "Documents", "tools.sample.config.json"),
            path.join("%USERPROFILE%", "Documents", "tools", "tools.sample.config.json"),
            path.join("%OneDrive%", "Desktop", "tools.sample.config.json"),
            path.join("%OneDrive%", "Desktop", "tools", "tools.sample.config.json"),
            path.join("%OneDrive%", "Documents", "tools.sample.config.json"),
            path.join("%OneDrive%", "Documents", "tools", "tools.sample.config.json"),
            path.join("%r%", "config", "tools.sample.config.json"),
            path.join("%r%", ".config", "tools.sample.config.json"),
        ]);
    });
});

test("getConfigFilePaths includes USERPROFILE, OneDrive, and r locations in order", () => {
    const baseDir = path.join("/workspace", "app");
    const userProfile = path.join("/users", "alice");
    const oneDrive = path.join("/users", "alice", "OneDrive");
    const rDir = path.join("/repos", "root");

    withEnv({ USERPROFILE: userProfile, OneDrive: oneDrive, r: rDir }, () => {
        const result = getConfigFilePaths(baseDir, "sample");

        deepEqual(result, [
            path.join(baseDir, "sample.config.json"),
            path.join(userProfile, "Desktop", "tools.sample.config.json"),
            path.join(userProfile, "Desktop", "tools", "tools.sample.config.json"),
            path.join(userProfile, "Documents", "tools.sample.config.json"),
            path.join(userProfile, "Documents", "tools", "tools.sample.config.json"),
            path.join(oneDrive, "Desktop", "tools.sample.config.json"),
            path.join(oneDrive, "Desktop", "tools", "tools.sample.config.json"),
            path.join(oneDrive, "Documents", "tools.sample.config.json"),
            path.join(oneDrive, "Documents", "tools", "tools.sample.config.json"),
            path.join(rDir, "config", "tools.sample.config.json"),
            path.join(rDir, ".config", "tools.sample.config.json"),
        ]);
    });
});

test("getConfig returns an empty object when no configuration files exist", () => {
    withTempDir((tempDir) => {
        withEnv({ USERPROFILE: undefined, OneDrive: undefined, r: undefined }, () => {
            const config = getConfig(tempDir, "missing");
            deepEqual(config, {});
        });
    });
});

test("getConfig merges files in precedence order using default shallow merge", () => {
    withTempDir((tempDir) => {
        const baseDir = path.join(tempDir, "base");
        const userProfile = path.join(tempDir, "user");
        const rDir = path.join(tempDir, "r");

        writeJson(path.join(baseDir, "app.json"), {
            fromBaseJson: true,
            overriddenByBaseConfig: "baseJson",
            overriddenByUser: "baseJson",
            overriddenByR: "baseJson",
        });
        writeJson(path.join(baseDir, "app.config.json"), {
            fromBaseConfig: true,
            overriddenByBaseConfig: "baseConfig",
            overriddenByUser: "baseConfig",
            overriddenByR: "baseConfig",
        });
        writeJson(path.join(userProfile, "Documents", "tools", "tools.app.config.json"), {
            fromUserTools: true,
            overriddenByUser: "userTools",
            overriddenByR: "userTools",
        });
        writeJson(path.join(rDir, "config", "tools.app.config.json"), {
            overriddenByR: "rConfig",
        });
        writeJson(path.join(rDir, ".config", "tools.app.config.json"), {
            overriddenByR: "rDotConfig",
        });

        withEnv({ USERPROFILE: userProfile, OneDrive: undefined, r: rDir }, () => {
            const config = getConfig(baseDir, "app");

            deepEqual(config, {
                fromBaseConfig: true,
                fromUserTools: true,
                overriddenByBaseConfig: "baseConfig",
                overriddenByUser: "userTools",
                overriddenByR: "rDotConfig",
            });
        });
    });
});

test("getConfig uses custom reduceConfig to combine array properties", () => {
    withTempDir((tempDir) => {
        const baseDir = path.join(tempDir, "base");
        const rDir = path.join(tempDir, "r");

        writeJson(path.join(baseDir, "tasks.config.json"), {
            items: ["one", "two"],
        });
        writeJson(path.join(rDir, ".config", "tools.tasks.config.json"), {
            items: ["three"],
        });

        withEnv({ USERPROFILE: undefined, OneDrive: undefined, r: rDir }, () => {
            /** @type {{ items: string[] }} */
            const config = getConfig(baseDir, "tasks", {
                reduceConfig: (previous, current) => ({
                    ...previous,
                    ...current,
                    items: [...(previous.items || []), ...(current.items || [])],
                }),
            });

            deepEqual(config, { items: ["one", "two", "three"] });
        });
    });
});

test("getConfig logs loaded and skipped file paths when printLoaded is true", () => {
    withTempDir((tempDir) => {
        const existingPath = path.join(tempDir, "print-test.config.json");
        writeJson(existingPath, { enabled: true });

        /** @type {string[]} */
        const logs = [];
        /** @type {string[]} */
        let expectedLogs = [];
        const originalLog = console.log;
        console.log = (...args) => {
            logs.push(args.join(" "));
        };

        try {
            withEnv({ USERPROFILE: tempDir, OneDrive: tempDir, r: tempDir }, () => {
                expectedLogs = [
                    "Loading alias configurations...",
                    ...getConfigFilePaths(tempDir, "print-test").map(
                        (filePath) => `${filePath === existingPath ? "." : " "} ${filePath}`
                    ),
                ];
                const config = getConfig(tempDir, "print-test", { printLoaded: true });
                deepEqual(config, { enabled: true });
            });
        } finally {
            console.log = originalLog;
        }

        deepEqual(logs, expectedLogs);
    });
});

report();
