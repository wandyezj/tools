import assert from "node:assert/strict";
import { parseJsonc } from "./parseJsonc.js";

/** @type {{ name: string, passed: boolean, error?: string }[]} */
const results = [];

/**
 * Run a test case, record the result, and log pass or fail to the console.
 *
 * @param {string} name
 * @param {() => void} lambda
 */
function test(name, lambda) {
    try {
        lambda();
        results.push({ name, passed: true });
        console.log(`PASS: ${name}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, error: message });
        console.log(`FAIL: ${name} - ${message}`);
        process.exitCode = 1;
    }
}

/**
 * Summarize recorded test results to the console.
 */
function report() {
    const passedCount = results.filter((result) => result.passed).length;
    const failedResults = results.filter((result) => !result.passed);

    console.log(`\nSummary: ${passedCount}/${results.length} passed, ${failedResults.length} failed`);
    if (failedResults.length > 0) {
        failedResults.forEach(({ name, error }) => {
            console.log(`  FAIL: ${name} - ${error}`);
        });
        process.exitCode = 1;
    }
}

test("parses standard JSON without comments", () => {
    const result = parseJsonc('{"name": "tools", "count": 2, "active": true}');
    assert.deepEqual(result, { name: "tools", count: 2, active: true });
});

test("removes full-line // comments", () => {
    const input = `// Leading comment
{
    // Comment inside object
    "key": "value"
}
// Trailing comment`;

    assert.deepEqual(parseJsonc(input), { key: "value" });
});

test("removes inline // comments and comments with CRLF line endings", () => {
    const input = '{\r\n    "first": 1, // inline comment\r\n    "second": 2 // another comment\r\n} // eof comment';
    assert.deepEqual(parseJsonc(input), { first: 1, second: 2 });
});

test("preserves // inside string literals", () => {
    const input = '{"url": "https://example.com//api/v1", "note": "not // a comment"}';
    assert.deepEqual(parseJsonc(input), {
        url: "https://example.com//api/v1",
        note: "not // a comment",
    });
});

test("handles escaped quotes and backslashes around // comments", () => {
    const input = `{
    "escapedQuote": "quote \\" // still in string",
    "escapedBackslash": "trailing slash \\\\" // comment after string
}`;

    assert.deepEqual(parseJsonc(input), {
        escapedQuote: 'quote " // still in string',
        escapedBackslash: "trailing slash \\",
    });
});

test("ignores quotes inside // comments", () => {
    const input = '// comment with unmatched " quote\n{"valid": true}';
    assert.deepEqual(parseJsonc(input), { valid: true });
});

test("removes comments before an array value", () => {
    const topLevelArray = `// comment before root array
[1, 2, 3]`;
    assert.deepEqual(parseJsonc(topLevelArray), [1, 2, 3]);

    const propertyArray = `{
    "items": // comment before property array value
    [
        "a",
        "b"
    ]
}`;
    assert.deepEqual(parseJsonc(propertyArray), { items: ["a", "b"] });
});

test("removes comments inside an array", () => {
    const input = `[
    // comment before first element
    "first", // inline comment after first element
    // comment between elements
    "second"
    // comment after last element
]`;
    assert.deepEqual(parseJsonc(input), ["first", "second"]);

    const emptyArrayWithComment = `[
    // only a comment inside empty array
]`;
    assert.deepEqual(parseJsonc(emptyArrayWithComment), []);
});

test("removes comments after an array", () => {
    const topLevelArray = `[1, 2, 3] // inline comment after array
// trailing line comment after array`;
    assert.deepEqual(parseJsonc(topLevelArray), [1, 2, 3]);

    const propertyArray = `{
    "items": [1, 2], // inline comment after array property
    // comment on line after array property
    "done": true
}`;
    assert.deepEqual(parseJsonc(propertyArray), { items: [1, 2], done: true });
});

test("handles empty // comments", () => {
    const withNewlines = `//
{
    "a": 1 //\r
}//`;
    assert.deepEqual(parseJsonc(withNewlines), { a: 1 });
});

test("handles comments without surrounding whitespace and between tokens", () => {
    const input = `{"key"//comment after key
://comment after colon
"value"//comment after value
,"num":1//comment after number
}`;
    assert.deepEqual(parseJsonc(input), { key: "value", num: 1 });
});

test("preserves // inside object keys", () => {
    const input = `{
    "https://example.com": true, // inline comment
    "a//b": "value"
}`;
    assert.deepEqual(parseJsonc(input), {
        "https://example.com": true,
        "a//b": "value",
    });
});

test("handles odd number of multiple backslashes before quotes", () => {
    const input = `{
    "tripleBackslashQuote": "path\\\\\\" // still in string" // outside comment
}`;
    assert.deepEqual(parseJsonc(input), {
        tripleBackslashQuote: 'path\\" // still in string',
    });
});

test("throws on empty or comment-only input", () => {
    assert.throws(() => parseJsonc(""), SyntaxError);
    assert.throws(() => parseJsonc("   \n  "), SyntaxError);
    assert.throws(() => parseJsonc("// only a comment"), SyntaxError);
    assert.throws(
        () =>
            parseJsonc(`// first comment
// second comment
`),
        SyntaxError
    );
});

test("handles empty object with comments and deeply nested structures", () => {
    const emptyObject = `{
    // only a comment inside empty object
}`;
    assert.deepEqual(parseJsonc(emptyObject), {});

    const nested = `{
    // outer comment
    "groups": [
        {
            // nested object comment
            "name": "alpha", // inline nested comment
            "tags": [
                // nested array comment
                "one",
                "two" // inline tag comment
            ]
        }
    ]
}`;
    assert.deepEqual(parseJsonc(nested), {
        groups: [
            {
                name: "alpha",
                tags: ["one", "two"],
            },
        ],
    });
});

test("throws on invalid JSON input", () => {
    assert.throws(() => {
        parseJsonc('{"unclosed": 1');
    }, SyntaxError);
});

report();
