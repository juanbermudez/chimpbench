// Minimal reader for the first worksheet of an .xlsx file's XML (no dependency): the caller unzips
// xl/sharedStrings.xml and xl/worksheets/sheet1.xml (e.g. `unzip -p`), this turns them into rows of strings/numbers.
// Handles shared strings (t="s"), inline strings, booleans and numbers; formulas are read by their cached values.

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) out.push(decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
  return out;
}

/** Column letters → 0-based index (A → 0, Z → 25, AA → 26). */
export function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export type Cell = string | number | null;

/** Rows of the sheet in order; missing cells are null. */
export function sheetRows(xml: string, strings: string[]): Cell[][] {
  const rows: Cell[][] = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Cell[] = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const idx = colIndex(c[1]), attrs = c[2], body = c[3] ?? '';
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let val: Cell = null;
      if (t === 's' && v !== undefined) val = strings[+v];
      else if (t === 'inlineStr') val = decode([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
      else if (t === 'str') val = v !== undefined ? decode(v) : null;
      else if (t === 'b') val = v === '1' ? 1 : 0;
      else if (v !== undefined) val = +v;
      while (row.length < idx) row.push(null);
      row[idx] = val;
    }
    rows.push(row);
  }
  return rows;
}

/** Header row + records keyed by header name. */
export function records(rows: Cell[][]): Record<string, Cell>[] {
  const head = rows[0].map(h => String(h ?? ''));
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? null])));
}

/** Excel serial day (1900 date system) → ISO date. */
export function excelDate(serial: number): string {
  return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10);
}
