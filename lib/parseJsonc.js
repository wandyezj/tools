/**
 * Parse JSONC text into JSON string by removing single-line `//` comments.
 *
 * @param {string} text
 * @returns {string}
 */
export function jsoncToJson(text) {
    let withoutComments = "";
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            withoutComments += char;
            if (isEscaped) {
                isEscaped = false;
            } else if (char === "\\") {
                isEscaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            withoutComments += char;
            continue;
        }

        if (char === "/" && text[i + 1] === "/") {
            i += 2;
            while (i < text.length && text[i] !== "\n" && text[i] !== "\r") {
                i++;
            }
            if (i < text.length) {
                withoutComments += text[i];
            }
            continue;
        }

        withoutComments += char;
    }
    return withoutComments;
}

/**
 * Parse JSONC text into an object after removing single-line `//` comments.
 *
 * @param {string} text
 * @returns {object}
 */
export function parseJsonc(text) {
    let withoutComments = jsoncToJson(text);

    return JSON.parse(withoutComments);
}
