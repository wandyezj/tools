/**
 *
 * @param {unknown} value
 * @returns {boolean} True if the value is a non-null object and not an array, false otherwise.
 */
export function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
