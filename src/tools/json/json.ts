export type JsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; offset?: number };

function jsonError(error: unknown): JsonResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/(?:position|at)\s+(\d+)/i);
  return match
    ? { ok: false, message, offset: Number(match[1]) }
    : { ok: false, message };
}

export function parseJson(input: string): JsonResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch (error) {
    return jsonError(error);
  }
}

export function formatJson(input: string): JsonResult<string> {
  const parsed = parseJson(input);
  return parsed.ok
    ? { ok: true, value: JSON.stringify(parsed.value, null, 2) }
    : parsed;
}

export function minifyJson(input: string): JsonResult<string> {
  const parsed = parseJson(input);
  return parsed.ok
    ? { ok: true, value: JSON.stringify(parsed.value) }
    : parsed;
}

export const escapeJsonString = (input: string): string => JSON.stringify(input);

export function unescapeJsonString(input: string): JsonResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return typeof parsed.value === 'string'
    ? { ok: true, value: parsed.value }
    : { ok: false, message: '输入必须是 JSON 字符串字面量' };
}
