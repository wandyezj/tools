const { execSync } = require("child_process");

const parameters = process.argv.slice(2);

if (parameters.length !== 0) {
    console.log(`usage: (no arguments) nukes the current checked out branch `);
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
    `git commit -am "temp"`, // if there is nothing to commit this errors
    `git branch -D ${branch}`,
    `git checkout -t origin/${branch}`,
    `git branch -D ${tempBranchName}`
];

commands.forEach(command => {
    console.log(command);
    try {
        execSync(command, {stdio: 'inherit'});
    } catch(e) {
        //console.log(e);
    }
    
});
