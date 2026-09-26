import { diffLines } from 'diff';

export type TextDiffRow = {
  left: string | null;
  right: string | null;
  kind: 'same' | 'added' | 'removed' | 'changed';
};

function rowsFromValue(value: string): string[] {
  return value.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+/g) ?? [];
}

function pairChanges(leftRows: string[], rightRows: string[]): TextDiffRow[] {
  const length = Math.max(leftRows.length, rightRows.length);
  return Array.from({ length }, (_, index) => {
    const left = leftRows[index] ?? null;
    const right = rightRows[index] ?? null;
    if (left === null) return { left, right, kind: 'added' as const };
    if (right === null) return { left, right, kind: 'removed' as const };
    return { left, right, kind: 'changed' as const };
  });
}

export function diffText(left: string, right: string): TextDiffRow[] {
  const parts = diffLines(left, right, {
    ignoreWhitespace: false,
    newlineIsToken: true,
  });
  const rows: TextDiffRow[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const next = parts[index + 1];

    if (part.removed && next?.added) {
      rows.push(...pairChanges(rowsFromValue(part.value), rowsFromValue(next.value)));
      index += 1;
      continue;
    }
    if (part.added && next?.removed) {
      rows.push(...pairChanges(rowsFromValue(next.value), rowsFromValue(part.value)));
      index += 1;
      continue;
    }

    const values = rowsFromValue(part.value);
    if (part.added) {
      rows.push(...values.map((value) => ({ left: null, right: value, kind: 'added' as const })));
    } else if (part.removed) {
      rows.push(...values.map((value) => ({ left: value, right: null, kind: 'removed' as const })));
    } else {
      rows.push(...values.map((value) => ({ left: value, right: value, kind: 'same' as const })));
    }
  }

  return rows;
}
