import { describe, expect, test } from 'vitest';
import { alignJson } from './jsonDiff';

describe('JSON structural alignment', () => {
  test('treats reordered object fields as equal', () => {
    const result = alignJson({ a: 1, b: 2 }, { b: 2, a: 1 });
    expect(result.ok && result.rows.every((row) => row.kind === 'same')).toBe(true);
    expect(result.ok && result.rows.map((row) => row.path)).toEqual(['', '/a', '/b']);
  });

  test('aligns nested repeated field names by their full path', () => {
    const result = alignJson(
      { x: { id: 1 }, y: { id: 2 } },
      { y: { id: 3 }, x: { id: 1 } },
    );
    expect(result.ok && result.rows.find((row) => row.path === '/y/id')?.kind).toBe('changed');
    expect(result.ok && result.rows.find((row) => row.path === '/x/id')?.kind).toBe('same');
  });

  test('distinguishes missing values from null and reports type changes', () => {
    const removed = alignJson({ a: null }, {});
    expect(removed.ok && removed.rows.find((row) => row.path === '/a')?.kind).toBe('removed');

    const changed = alignJson({ value: 1 }, { value: '1' });
    expect(changed.ok && changed.rows.find((row) => row.path === '/value')?.kind).toBe('type-changed');
  });

  test('escapes JSON Pointer path segments', () => {
    const result = alignJson({ 'a/b~c': 1 }, { 'a/b~c': 2 });
    expect(result.ok && result.rows.find((row) => row.path === '/a~1b~0c')?.kind).toBe('changed');
  });
});
