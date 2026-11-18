# Repository instructions

## JavaScript files

- Prefer `.js` over `.cjs` for JavaScript files, including CommonJS scripts.
- Add `// @ts-check` at the top of JavaScript files, immediately after the shebang if one is present.

## JavaScript imports

- Keep static `import` statements and `require()` declarations at the top of the file, grouped with the other imports.
- For `fs` and `path` (including their `node:` forms), keep namespace imports such as `import * as fs from 'node:fs'` and `import * as path from 'node:path'`, or whole-module bindings such as `const fs = require('node:fs')` and `const path = require('node:path')`. For other modules, prefer named imports or destructured `require()` calls for only the functions used.
- Do not place `require()` calls inside functions for dependencies that can be imported at module scope.

## Windows automation

- Do not use PowerShell in implementations or development commands.
- Prefer Node.js and built-in Windows commands, using `cmd.exe` when a shell is needed.
