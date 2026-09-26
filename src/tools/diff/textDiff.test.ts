import { describe, expect, test } from 'vitest';
import { diffText } from './textDiff';

describe('text diff rows', () => {
  test('pairs adjacent removed and added lines as a change', () => {
    const rows = diffText('a\nb\n', 'a\nc\n');
    expect(rows.some((row) => row.kind === 'changed')).toBe(true);
  });

  test('keeps insertions and deletions on their respective side', () => {
    expect(diffText('a\n', 'a\nb\n')).toContainEqual({
      left: null,
      right: 'b\n',
      kind: 'added',
    });
    expect(diffText('a\nb\n', 'a\n')).toContainEqual({
      left: 'b\n',
      right: null,
      kind: 'removed',
    });
  });

  test('detects final-newline and CRLF differences', () => {
    expect(diffText('a\n', 'a').some((row) => row.kind !== 'same')).toBe(true);
    expect(diffText('a\r\nb', 'a\nb').some((row) => row.kind !== 'same')).toBe(true);
  });
});
