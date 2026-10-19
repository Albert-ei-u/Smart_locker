export function escapeCsvField(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  const normalized = text.startsWith("=") || text.startsWith("+") || text.startsWith("-") || text.startsWith("@") ? `'${text}` : text;
  const escaped = normalized.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function buildCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvField).join(",")).join("\n")}`;
}
