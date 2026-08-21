export function expandPercentEnvVariables(value) {
    // Expand Windows-style %VAR% tokens and leave unknown variables untouched.
    return value.replace(/%([^%]+)%/g, (match, rawName) => {
        const name = rawName.trim();
        if (name.length === 0) {
            return match;
        }

        const envValue = process.env[name];
        return envValue === undefined ? match : envValue;
    });
}