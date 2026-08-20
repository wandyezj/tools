const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function checkGitHubDesktop() {
    const platform = os.platform();

    if (platform === 'win32') {
        const ghDesktopPath = path.join(os.homedir(), 'AppData', 'Local', 'GitHubDesktop');
        return fs.existsSync(ghDesktopPath);
    } else if (platform === 'darwin') {
        return fs.existsSync('/Applications/GitHub Desktop.app');
    }

    console.log('Automatic detection for Linux is not supported.');
    return false;
}

function installGitHubDesktop() {
    const platform = os.platform();
    console.log('Attempting to install GitHub Desktop...');

    try {
        if (platform === 'win32') {
            execSync('winget install GitHub.GitHubDesktop --accept-source-agreements --accept-package-agreements', { stdio: 'inherit' });
        } else if (platform === 'darwin') {
            execSync('brew install --cask github-desktop', { stdio: 'inherit' });
        }
        console.log('GitHub Desktop installed successfully.');
    } catch (error) {
        console.error('Installation failed. Install manually from https://desktop.github.com/', error.message);
    }
}

console.log('Checking for GitHub Desktop...');

if (checkGitHubDesktop()) {
    console.log('GitHub Desktop is already installed.');
} else {
    console.log('GitHub Desktop is not installed.');
    installGitHubDesktop();
}