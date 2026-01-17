const os = require("os");
const { execSync } = require("child_process");

const platform = os.platform();
const isWindows = platform === "win32";
const isMac = platform === "darwin";

// Change command depending on the platform
if (isWindows) {
    execSync("taskkill /F /IM node.exe", { stdio: "inherit" });
} else if (isMac) {
    execSync("killall -9 node", { stdio: "inherit" });
} else {
    console.error("Unsupported platform:", platform);
    process.exit(1);
}
