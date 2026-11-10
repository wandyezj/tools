/**
 * @param {string[]} values
 * @returns {{name: string, indices: number[]}[]}
 */
export function findDuplicates(values) {
    /** @type {{name: string, indices: number[]}[]} */
    const groups = [];
    values.forEach((name, index) => {
        const group = groups.find((entry) => entry.name === name);
        if (group) {
            group.indices.push(index);
        } else {
            groups.push({ name, indices: [index] });
        }
    });
    return groups.filter((group) => group.indices.length > 1);
}
