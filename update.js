const { execSync } = require("child_process");

console.log("Update tools...");

function run(command) {
    execSync(command, { stdio: "inherit", cwd: __dirname });
}

run("cd");
run("git fetch");
run("git pull");
