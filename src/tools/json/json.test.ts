import { describe, expect, test } from 'vitest';
import {
  escapeJsonString,
  formatJson,
  minifyJson,
  parseJson,
  unescapeJsonString,
} from './json';

describe('JSON transforms', () => {
  test('formats and minifies without changing data', () => {
    expect(formatJson('{"x":1}')).toEqual({
      ok: true,
      value: '{\n  "x": 1\n}',
    });
    expect(minifyJson('{ "x" : 1 }')).toEqual({
      ok: true,
      value: '{"x":1}',
    });
  });

  test('round-trips quotes, slashes, newlines, and Unicode as a JSON string', () => {
    const raw = 'a"b\\c\n你好';
    expect(unescapeJsonString(escapeJsonString(raw))).toEqual({
      ok: true,
      value: raw,
    });
  });

  test('rejects non-string unescape input and invalid JSON', () => {
    expect(unescapeJsonString('{"x":1}').ok).toBe(false);
    expect(parseJson('{broken').ok).toBe(false);
  });
});
