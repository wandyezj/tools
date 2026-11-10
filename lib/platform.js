import os from "os";
const platform = os.type();

/**
 * Running on Windows
 */
export const isWindows = platform === "Windows_NT";

/**
 * Running on macOS
 */
export const isMac = platform === "Darwin";

/**
 * Running on Linux
 */
export const isLinux = platform === "Linux";

/**
 * The name of the current platform.
 * @type {"windows" | "mac" | "linux" | "unknown"} The name of the current platform.
 */
export const platformName = [
    [isWindows, "windows"],
    [isMac, "mac"],
    [isLinux, "linux"],
    [true, "unknown"],
].filter(([condition]) => condition)[0]?.[1];