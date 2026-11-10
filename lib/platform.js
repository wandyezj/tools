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