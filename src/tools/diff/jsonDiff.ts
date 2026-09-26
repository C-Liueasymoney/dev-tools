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

export function alignJson(
  left: unknown,
  right: unknown,
  _keyFields: Record<string, string> = {},
): JsonDiffResult {
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
      const length = Math.max(leftArray.length, rightArray.length);
      const descendants = Array.from({ length }, (_, index) => visit(
        index < leftArray.length ? leftArray[index] : MISSING,
        index < rightArray.length ? rightArray[index] : MISSING,
        `${path}/${index}`,
        depth + 1,
      )).flat();
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

  return { ok: true, rows: visit(left, right, '', 0) };
}
