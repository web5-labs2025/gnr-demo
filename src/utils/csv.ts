export function exportCsv(filename: string, rows: (string | number | bigint)[][]) {
  const text = rows.map((r) => r.map((c) => String(c)).join(",")).join("\n");
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}