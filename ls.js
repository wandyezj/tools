const fs = require('fs');

fs.readdir('.', { withFileTypes: true }, (error, files) => {
    if (error) {
        console.error(`Error reading directory: ${error.message}`);
        return;
    }

    files.forEach(file => {
        console.log(file.name);
    });
});
