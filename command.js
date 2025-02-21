const { execSync } = require("child_process");

const parameters = process.argv.slice(2);

if (parameters.length < 1) {
    console.log("usage: [command]");
    process.exit(0);
}


execSync(`${parameters.join(" ")}`, {stdio: 'inherit'});
