#!/usr/bin/env node

// Load alias.js script
const fs = require("fs");
const path = require("path");

const data = fs.readFileSync(path.join(__dirname, "alias.js"), "utf8");
eval(data);
