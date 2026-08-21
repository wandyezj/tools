const fs = require("node:fs");
const path = require("node:path");
const { prompt } = require("./lib/prompt.js");

const parameters = process.argv.slice(2);

if (parameters.length < 1) {
    console.log("usage: [files to delete]");
    process.exit(0);
}

const items = parameters.map(
    item => path.normalize(item)).map(
    item => path.resolve(item)
);


console.log("\t" + items.join("\n\t"));

async function main() {
    const answer = await prompt("\nType y to delete these items: ");
    if (answer.trim().toLowerCase() !== "y") {
        console.log("Nothing deleted.");
        return;
    }
    console.log("");

    items.forEach(item => {
        if (fs.existsSync(item)) {
            try {
                fs.rmSync(item, {
                    recursive: true
                });
                console.log(`${item} [deleted]`);
            } catch (error) {
                console.log(`${item} [error: ${error.message}]`);
            }
        } else {
            console.log(`${item} [not found]`);
        }
    });
}

main();
