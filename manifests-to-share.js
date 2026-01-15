const fs = require("fs");
const path = require("path");

const os = require("os");
const isMac = "Darwin" === os.type();

const env = process.env;
const username = env["USER"];

// https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-an-office-add-in-on-mac
const shareDirectoryMac = `/Users/${username}/Library/Containers/com.microsoft.Excel/Data/Documents/wef`;

// Network share
const shareDirectoryWin = "C:/manifests";

// Usage: node manifests-to-share.js [manifestDirectory]
// If no argument is provided, it defaults to "./manifests"
const parameters = process.argv.slice(2);
const [manifestDirectorySource] = parameters;

const manifestDirectory = manifestDirectorySource || "./manifests";
const shareDirectory = isMac ? shareDirectoryMac : shareDirectoryWin;

const manifests = fs
    .readdirSync(manifestDirectory)
    .filter((file) => file.endsWith(".xml") && (file.startsWith("production") || file.startsWith("local")) || (manifestDirectorySource && file.endsWith("manifest.xml")));

function getManifestPrefix(data) {
    const displayName = data.split(`<DisplayName DefaultValue="`)[1].split(`"`)[0];
    const prefix = displayName.replace("(local)", "").trim().split(" ").join("-").toLowerCase();
    return prefix;
}

manifests.forEach((file) => {
    const source = path.join(manifestDirectory, file);

    const data = fs.readFileSync(source, { encoding: "utf-8" });

    const uniquePrefix = getManifestPrefix(data);
    const name = `${uniquePrefix}.${file}`;
    const destination = path.join(shareDirectory, name);
    console.log(`${name}\n\t${source} -> ${destination}`);

    fs.writeFileSync(destination, data);
});
