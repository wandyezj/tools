---
name: move-function-to-lib
description: 'Use when extracting a JavaScript function into lib or sharing a helper without changing behavior.'
---

# Move Function to Lib

1. Read repository instructions, the function, its callers, and nearby helpers. Reuse an existing helper if suitable.
2. Pass dependencies explicitly. Leave application configuration, logging, and exit handling in the caller.
3. Move the function and JSDoc to `lib/<functionName>.js` with a named `export function`. Preserve types, output, ordering, indices, and edge cases.
4. Remove the old definition. Update callers with module-scope imports matching their style; command scripts use `const { functionName } = require("./lib/functionName")`. Avoid unrelated edits.
5. Run existing checks or focused Node.js assertions for normal, empty, and edge-case inputs and exact return shapes. Check syntax, diagnostics, and imports without executing real scheduled tasks.
6. On Windows, use Node.js and `cmd.exe`, not PowerShell. Delete temporary files; report changes and checks.
