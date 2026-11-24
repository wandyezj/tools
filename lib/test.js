// @ts-check

/** @type {{ name: string, passed: boolean, error?: string }[]} */
const results = [];

/**
 * Run a test case, record the result, and log pass or fail to the console.
 *
 * @param {string} name
 * @param {() => void} lambda
 */
export function test(name, lambda) {
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
export function report() {
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
