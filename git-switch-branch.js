const { execSync } = require("child_process");

const parameters = process.argv.slice(2);

if (parameters.length !== 1) {
    console.log("usage: [branch-name]");
    process.exit(0);
}

const branchName = parameters[0];

/**
 * 
 * @param {string} branchName 
 * @returns {boolean} true if the branch name can be switched to
 */
function canSwitchToBranchName(branchName) {
    const output = execSync(`git branch`, { encoding: "utf-8" });
    const branches = output.trim().split("\n").map(line => line.trim());
    const currentBranch = branches.filter(line => line.startsWith("*")).map(branch => branch.split("*")[1].trim()).pop();

    if (currentBranch === branchName) {
        console.log(`Already on branch ${branchName}`);
        return false;
    }

    if (!branches.includes(branchName)) {
        console.error(`Branch ${branchName} does not exist`);
        return false;
    }

    return true

}

if (canSwitchToBranchName(branchName)) {
    execSync(`git checkout ${branchName}`, {stdio: 'inherit'});
}

// Show current branches
execSync(`git branch`, {stdio: 'inherit'});