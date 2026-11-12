export function getTimeStampEntries() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hourCycle: "h23",
        timeZoneName: "short",
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

    return values;
}

export function getTimeStamp(values: Record<string, string>) {
    const timestamp = `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}.${values.fractionalSecond} ${values.timeZoneName}`;

    return timestamp;
}

export function getTimeStampFileName(values: Record<string, string>) {
    const timestamp = `${values.year}-${values.month}-${values.day}_${values.hour}${values.minute}_${values.second}${values.fractionalSecond}`;

    return timestamp;
}