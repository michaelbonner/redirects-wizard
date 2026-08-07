import type { Url } from "./context";

const empty = "-";

export function print(line = "") {
    process.stdout.write(`${line}\n`);
}

export function printJson(value: unknown) {
    print(JSON.stringify(value, null, 2));
}

/** Renders a left-aligned table with a two-space gutter, or a hint when empty. */
export function printTable(headers: string[], rows: string[][], emptyHint = "No rows.") {
    if (!rows.length) {
        print(emptyHint);
        return;
    }

    const widths = headers.map((header, column) =>
        Math.max(header.length, ...rows.map((row) => (row[column] ?? "").length)),
    );

    const format = (cells: string[]) =>
        cells
            .map((cell, column) =>
                column === cells.length - 1 ? cell : cell.padEnd(widths[column]),
            )
            .join("  ")
            .trimEnd();

    print(format(headers));
    for (const row of rows) print(format(row));
}

export function printFields(fields: [string, string][]) {
    const width = Math.max(...fields.map(([label]) => label.length));
    for (const [label, value] of fields) print(`${`${label}:`.padEnd(width + 1)} ${value}`);
}

export function text(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return empty;
    return String(value);
}

export function date(value: Date | null) {
    if (!value) return empty;
    return value.toISOString().slice(0, 10);
}

export function statusCode(url: Pick<Url, "httpResponse">) {
    return text(url.httpResponse?.status_code);
}

export function yesNo(value: boolean) {
    return value ? "yes" : "no";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}
