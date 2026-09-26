export const MISSING = Symbol('missing');
export type Missing = typeof MISSING;

export type JsonDiffRow = {
  path: string;
  depth: number;
  left: unknown | Missing;
  right: unknown | Missing;
  kind: 'same' | 'added' | 'removed' | 'changed' | 'type-changed';
};

export type JsonDiffResult =
  | { ok: true; rows: JsonDiffRow[] }
  | { ok: false; path: string; message: string };

function valueType(value: unknown | Missing) {
  if (value === MISSING) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value === 'object' ? 'object' : typeof value;
}

function pointerSegment(value: string) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function own(object: Record<string, unknown>, key: string) {
  return Object.hasOwn(object, key) ? object[key] : MISSING;
}

function idKey(item: unknown, field: string): string | null {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return null;
  const value = (item as Record<string, unknown>)[field];
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return `${typeof value}:${String(value)}`;
}

export function alignJson(
  left: unknown,
  right: unknown,
  keyFields: Record<string, string> = {},
): JsonDiffResult {
  let failure: Extract<JsonDiffResult, { ok: false }> | null = null;

  const indexByIdentifier = (
    items: unknown[],
    field: string,
    path: string,
    side: '左侧' | '右侧',
  ) => {
    const indexed = new Map<string, unknown>();
    for (let index = 0; index < items.length; index += 1) {
      const key = idKey(items[index], field);
      if (key === null) {
        failure = {
          ok: false,
          path,
          message: `${side}数组第 ${index + 1} 项缺少字符串或数字标识字段 “${field}”`,
        };
        return null;
      }
      if (indexed.has(key)) {
        failure = {
          ok: false,
          path,
          message: `${side}数组的标识字段 “${field}” 存在重复值`,
        };
        return null;
      }
      indexed.set(key, items[index]);
    }
    return indexed;
  };

  const visit = (
    leftValue: unknown | Missing,
    rightValue: unknown | Missing,
    path: string,
    depth: number,
  ): JsonDiffRow[] => {
    const leftType = valueType(leftValue);
    const rightType = valueType(rightValue);

    if (leftType === 'missing' || rightType === 'missing') {
      const kind = leftType === 'missing' ? 'added' : 'removed';
      const present = leftType === 'missing' ? rightValue : leftValue;
      const row: JsonDiffRow = { path, depth, left: leftValue, right: rightValue, kind };

      if (Array.isArray(present)) {
        const identifierField = keyFields[path];
        if (identifierField) {
          const side = leftType === 'missing' ? '右侧' : '左侧';
          if (!indexByIdentifier(present, identifierField, path, side)) return [];
        }
        const descendants = present.flatMap((item, index) => visit(
          leftType === 'missing' ? MISSING : item,
          rightType === 'missing' ? MISSING : item,
          `${path}/${index}`,
          depth + 1,
        ));
        return [row, ...descendants];
      }
      if (present !== null && typeof present === 'object') {
        const object = present as Record<string, unknown>;
        const descendants = Object.keys(object).flatMap((key) => visit(
          leftType === 'missing' ? MISSING : object[key],
          rightType === 'missing' ? MISSING : object[key],
          `${path}/${pointerSegment(key)}`,
          depth + 1,
        ));
        return [row, ...descendants];
      }
      return [row];
    }

    if (leftType !== rightType) {
      return [{ path, depth, left: leftValue, right: rightValue, kind: 'type-changed' }];
    }

    if (leftType === 'object') {
      const leftObject = leftValue as Record<string, unknown>;
      const rightObject = rightValue as Record<string, unknown>;
      const keys = [
        ...Object.keys(leftObject),
        ...Object.keys(rightObject).filter((key) => !Object.hasOwn(leftObject, key)),
      ];
      const descendants = keys.flatMap((key) => visit(
        own(leftObject, key),
        own(rightObject, key),
        `${path}/${pointerSegment(key)}`,
        depth + 1,
      ));
      const kind = descendants.every((row) => row.kind === 'same') ? 'same' : 'changed';
      return [{ path, depth, left: leftValue, right: rightValue, kind }, ...descendants];
    }

    if (leftType === 'array') {
      const leftArray = leftValue as unknown[];
      const rightArray = rightValue as unknown[];
      const identifierField = keyFields[path];
      let descendants: JsonDiffRow[];

      if (identifierField) {
        const leftItems = indexByIdentifier(leftArray, identifierField, path, '左侧');
        const rightItems = indexByIdentifier(rightArray, identifierField, path, '右侧');
        if (!leftItems || !rightItems) return [];
        const identifiers = [
          ...leftItems.keys(),
          ...Array.from(rightItems.keys()).filter((key) => !leftItems.has(key)),
        ];
        descendants = identifiers.flatMap((key, index) => visit(
          leftItems.has(key) ? leftItems.get(key) : MISSING,
          rightItems.has(key) ? rightItems.get(key) : MISSING,
          `${path}/${index}`,
          depth + 1,
        ));
      } else {
        const length = Math.max(leftArray.length, rightArray.length);
        descendants = Array.from({ length }, (_, index) => visit(
          index < leftArray.length ? leftArray[index] : MISSING,
          index < rightArray.length ? rightArray[index] : MISSING,
          `${path}/${index}`,
          depth + 1,
        )).flat();
      }
      const kind = descendants.every((row) => row.kind === 'same') ? 'same' : 'changed';
      return [{ path, depth, left: leftValue, right: rightValue, kind }, ...descendants];
    }

    return [{
      path,
      depth,
      left: leftValue,
      right: rightValue,
      kind: Object.is(leftValue, rightValue) ? 'same' : 'changed',
    }];
  };

  const rows = visit(left, right, '', 0);
  return failure ?? { ok: true, rows };
}
