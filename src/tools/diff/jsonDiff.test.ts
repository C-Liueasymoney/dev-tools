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

  test('matches configured array objects by typed identifier', () => {
    const reordered = alignJson(
      { items: [{ id: 1, value: 'a' }, { id: 2, value: 'b' }] },
      { items: [{ id: 2, value: 'b' }, { id: 1, value: 'a' }] },
      { '/items': 'id' },
    );
    expect(reordered.ok && reordered.rows.every((row) => row.kind === 'same')).toBe(true);

    const typedIds = alignJson(
      { items: [{ id: 1 }] },
      { items: [{ id: '1' }] },
      { '/items': 'id' },
    );
    expect(typedIds.ok && typedIds.rows.some((row) => row.kind === 'removed')).toBe(true);
    expect(typedIds.ok && typedIds.rows.some((row) => row.kind === 'added')).toBe(true);
  });

  test('appends right-only identifiers after left-side order', () => {
    const result = alignJson(
      { items: [{ id: 2 }] },
      { items: [{ id: 3 }, { id: 2 }] },
      { '/items': 'id' },
    );
    expect(result.ok && result.rows.find((row) => row.path === '/items/1')?.kind).toBe('added');
  });

  test('rejects missing, non-scalar, and duplicate identifiers', () => {
    expect(alignJson(
      { items: [{ id: 1 }, { id: 1 }] },
      { items: [] },
      { '/items': 'id' },
    )).toMatchObject({ ok: false, path: '/items' });
    expect(alignJson(
      { items: [{}] },
      { items: [] },
      { '/items': 'id' },
    )).toMatchObject({ ok: false, path: '/items' });
  });

  test('validates identifiers when a configured array exists on only one side', () => {
    expect(alignJson(
      {},
      { items: [{ value: 'missing id' }] },
      { '/items': 'id' },
    )).toMatchObject({ ok: false, path: '/items' });
  });
});
