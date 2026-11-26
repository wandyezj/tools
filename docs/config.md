# Config

Config files hold each command's settings. Start with [Quick Setup](#quick-setup)
to copy the templates, edit your settings, and check that commands can find them.

## Prerequisite

Complete the tools setup before configuring commands:

- macOS: [../setup.zsh](../setup.zsh)
- Windows: [../setup.cmd](../setup.cmd)

Setup configures `r`, the directory that holds your tools repository. Open a new
terminal afterward to pick up the environment settings.

## Quick Setup

Copy command templates:

```text
t config -- --copy
```

The command writes config files to  `%r%/.config`.

## Edit Configs

Configs support `//` comments like jsonc.

Example:

```jsonc
{
    // Prefix for new branch names.
    "prefix": "feature-" // Inline comments are supported too.
}
```

## Check Configs

See the enabled search paths for each command:

```text
t config -- --list
```

Paths appear under each command's name, in merge order. A `.` marks a config files that exist.

See current search paths and configs:

```text
t config -- --locations
```

## Choose Search Locations

The "config config," [../config.config.json](../config.config.json), controls
which command configs are searched for by id.

