# Repository instructions

## JavaScript imports

- Keep static `import` statements and `require()` declarations at the top of the file, grouped with the other imports.
- Do not place `require()` calls inside functions for dependencies that can be imported at module scope.

## Windows automation

- Do not use PowerShell in implementations or development commands.
- Prefer Node.js and built-in Windows commands, using `cmd.exe` when a shell is needed.
