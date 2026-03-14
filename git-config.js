const { execSync } = require("child_process");

execSync("git config --local push.autoSetupRemote true", { stdio: "inherit" });

// Don't track changes to file mode
execSync("git config --local core.fileMode false", { stdio: "inherit" });
