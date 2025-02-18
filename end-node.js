const { execSync } = require("child_process");

execSync("taskkill /F /IM node.exe", {stdio: 'inherit'});
