---
name: knowledge
description: 'Use when consulting, adding, or updating general knowledge.'
---

# Knowledge

## Procedure

1. List the files in `references/` with the [Node.js script](./scripts/list-references.js). From the repository root, run:

	```sh
	node .agents/skills/knowledge/scripts/list-references.js
	```

	From elsewhere, use the script's absolute path. It locates `references/` relative to itself. If it fails, report the error; do not assume the folder is empty.
2. Read the [reference index](./references/README.md) for topic descriptions. Check the file list for relevant documents missing from the index.
3. Read only what the task needs.
4. Verify claims against current code or authoritative sources. Flag gaps and stale information; do not guess.
5. Keep one topic per Markdown file in `references/`. When adding or updating a topic, update the index and its direct link below so each reference can be loaded on its own.

## References

- [Reference index](./references/README.md): Topics and authoring guidance.
- [API terminology](./references/api-terminology.md): General API terminology and definitions.