const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const parameters = process.argv.slice(2);

if (parameters.length !== 0) {
    console.log("usage: nukes the current branch");
    process.exit(0);
}

// figure out the branch name
const output = execSync(`git branch`, { encoding: "utf-8" });
const branch = output.split("\n").filter(line => line.trim().startsWith("*")).map(branch => branch.split("*")[1].trim()).pop()

console.log("Nuke")
console.log(branch);
if (branch === "" || branch === undefined) {
    console.error("No branch found");
    process.exit(0);
}

const tempBranchName = `temp-${branch}`;

const commands = [
    `git checkout -b ${tempBranchName}`,
    `git branch -D ${branch}`,
    `git checkout -t origin/${branch}`,
    `git branch -D ${tempBranchName}`
];

commands.forEach(command => {
    console.log(command);
    execSync(command, {stdio: 'inherit'});
});
