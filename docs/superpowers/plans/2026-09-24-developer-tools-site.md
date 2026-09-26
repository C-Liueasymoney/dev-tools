# Developer Tools Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, browser-local developer tools site with JSON processing, aligned text/JSON Diff, and timestamp conversion.

**Architecture:** A React application shares navigation, input controls, and feedback components. Each tool owns a page and pure transformation module. JSON Diff builds one ordered row model before rendering two synchronized columns; all input persistence stays in tab-scoped `sessionStorage`.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, and jsdiff (`diff`). Commit the generated `package-lock.json` so another agent can run `npm ci`.

**Spec:** `docs/superpowers/specs/2026-09-24-developer-tools-site-design.md`

## Global Constraints

- First release contains exactly three tools: JSON processing, Diff, and timestamp conversion.
- Build output is static; no business backend, account, telemetry that uploads input, or PWA requirement.
- Inputs and calculations stay in the browser; inputs never appear in URLs.
- Each tool's input survives refresh in the same tab via `sessionStorage`; storage failure must not prevent use.
- JSON Diff remains side by side at narrow widths, with horizontal scrolling.
- JSON object field order alone is never a difference; arrays support positional and configured identifier matching.
- No product code is implemented by this plan document; each task below is for the next agent.

## Review Focus

1. JSON string escaping with quotes, backslashes, newlines, and Unicode must round-trip without corrupting text; Task 2 tests this.
2. Text containing CRLF and a final newline must retain those differences; Task 3 tests this.
3. Nested objects that reuse the same field name must align by full path, not by leaf name; Task 4 tests this.
4. Array identifiers `1` and `"1"` must not match, and duplicate identifiers must fail visibly; Task 5 tests this.
5. Invalid local dates and timestamps beyond `Date` range must fail rather than normalize silently; Task 6 tests this.

## File Map

- `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`: build, scripts, and test configuration.
- `src/main.tsx`, `src/App.tsx`, `src/styles.css`: application entry, three-tool navigation, shared layout.
- `src/shared/useSessionInput.ts`, `src/shared/useSessionInput.test.ts`: per-tab input persistence with storage failure handling.
- `src/tools/json/json.ts`, `src/tools/json/json.test.ts`, `src/tools/json/JsonPage.tsx`: JSON transforms and page.
- `src/tools/diff/textDiff.ts`, `src/tools/diff/textDiff.test.ts`, `src/tools/diff/DiffPage.tsx`: text line model and two-mode page.
- `src/tools/diff/jsonDiff.ts`, `src/tools/diff/jsonDiff.test.ts`, `src/tools/diff/JsonDiffView.tsx`: JSON alignment model and side-by-side renderer.
- `src/tools/time/time.ts`, `src/tools/time/time.test.ts`, `src/tools/time/TimePage.tsx`: timestamp transforms and page.
- `src/App.test.tsx`, `README.md`: end-to-end interaction checks and clone-to-run guidance.

## Tasks

### Task 1: Static app shell and tab-scoped input

**Files:** Create build files, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/shared/useSessionInput.ts`, and its test.

**Interfaces:** Produces `useSessionInput(key: string, initial?: string): [string, (next: string) => void, () => void, string | null]`; later pages consume it. Produces `App` with navigation keys `json`, `diff`, `time`.

- [x] **Step 1: Write the failing session test.** Create `src/shared/useSessionInput.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { useSessionInput } from './useSessionInput';

beforeEach(() => sessionStorage.clear());
test('restores input in the same tab and clears only its own key', () => {
  const first = renderHook(() => useSessionInput('json'));
  act(() => first.result.current[1]('{"a":1}'));
  first.unmount();
  const again = renderHook(() => useSessionInput('json'));
  expect(again.result.current[0]).toBe('{"a":1}');
  act(() => again.result.current[2]());
  expect(sessionStorage.getItem('tool:json')).toBeNull();
});
```

- [x] **Step 2: Scaffold and verify red.** Create the Vite React TypeScript files, install `react`, `react-dom`, `diff` and dev dependencies `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`, `@types/node`; add scripts `dev`, `build`, `test`, `typecheck`. Set Vitest environment to `jsdom`. Run `npm test -- --run src/shared/useSessionInput.test.ts`; expect a missing-module failure.

- [x] **Step 3: Implement the hook and shell.** Use a lazy state initializer to read `sessionStorage`, a setter that updates state even if storage throws, and a clear function that removes only `tool:${key}`. Return a warning string on storage failure. Build a simple `App` that switches the three page components without changing URL parameters. Mount it from `src/main.tsx`. Start with empty page components inside their future files; replace each in its task. The hook implementation is:

```ts
import { useState } from 'react';
export function useSessionInput(key: string, initial = ''):
  [string, (next: string) => void, () => void, string | null] {
  const storageKey = `tool:${key}`;
  const [value, setValue] = useState(() => {
    try { return sessionStorage.getItem(storageKey) ?? initial; }
    catch { return initial; }
  });
  const [warning, setWarning] = useState<string | null>(null);
  const update = (next: string) => {
    setValue(next);
    try { sessionStorage.setItem(storageKey, next); setWarning(null); }
    catch { setWarning('本次输入无法在刷新后恢复'); }
  };
  const clear = () => {
    setValue('');
    try { sessionStorage.removeItem(storageKey); setWarning(null); }
    catch { setWarning('本次输入无法在刷新后恢复'); }
  };
  return [value, update, clear, warning];
}
```

- [x] **Step 4: Verify and commit.** Run `npm test -- --run src/shared/useSessionInput.test.ts`, `npm run typecheck`, and `npm run build`; all pass. Commit the shell, lockfile, and hook as `feat: scaffold static tool shell`.

### Task 2: JSON validation, formatting, minification, and string escaping

**Files:** Create `src/tools/json/json.ts`, `src/tools/json/json.test.ts`; replace the empty `src/tools/json/JsonPage.tsx`.

**Interfaces:** Produce `parseJson(input: string): JsonResult<unknown>`, `formatJson(input: string): JsonResult<string>`, `minifyJson(input: string): JsonResult<string>`, `escapeJsonString(input: string): string`, and `unescapeJsonString(input: string): JsonResult<string>`. `JsonResult<T>` is `{ ok: true; value: T } | { ok: false; message: string; offset?: number }`.

- [x] **Step 1: Write failing transformation tests.** Include these assertions in `json.test.ts`:

```ts
expect(formatJson('{"x":1}')).toEqual({ ok: true, value: '{\n  "x": 1\n}' });
expect(minifyJson('{ "x" : 1 }')).toEqual({ ok: true, value: '{"x":1}' });
const raw = 'a"b\\c\n你好';
expect(unescapeJsonString(escapeJsonString(raw))).toEqual({ ok: true, value: raw });
expect(unescapeJsonString('{"x":1}').ok).toBe(false);
expect(parseJson('{broken').ok).toBe(false);
```

- [x] **Step 2: Run red.** `npm test -- --run src/tools/json/json.test.ts`; expect missing exports.
- [x] **Step 3: Implement pure functions and page.** Use `JSON.parse` and `JSON.stringify(value, null, 2)` / `JSON.stringify(value)`. `escapeJsonString` uses `JSON.stringify(input)`. `unescapeJsonString` parses and checks `typeof value === 'string'`. Derive offset from native syntax errors where available; otherwise show a reason without inventing a position. Keep source input separate from output. Page controls: validate, format, minify, escape, unescape, copy output, clear input.

```ts
export const escapeJsonString = (input: string): string => JSON.stringify(input);
export function unescapeJsonString(input: string): JsonResult<string> {
  try {
    const value: unknown = JSON.parse(input);
    return typeof value === 'string'
      ? { ok: true, value }
      : { ok: false, message: '输入必须是 JSON 字符串字面量' };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}
```
- [x] **Step 4: Verify and commit.** Run the focused test, `npm run typecheck`, `npm run build`; commit as `feat: add JSON processing tool`.

### Task 3: Plain text Diff

**Files:** Create `src/tools/diff/textDiff.ts`, `src/tools/diff/textDiff.test.ts`; create `src/tools/diff/DiffPage.tsx` with text mode and an empty JSON mode view.

**Interfaces:** Produce `diffText(left: string, right: string): TextDiffRow[]`, where `TextDiffRow` is `{ left: string | null; right: string | null; kind: 'same' | 'added' | 'removed' | 'changed' }`. `DiffPage` owns separate session keys for text-left, text-right, json-left, and json-right.

- [x] **Step 1: Write failing row tests.** Include an insertion, deletion, and a CRLF/final-newline case:

```ts
expect(diffText('a\nb\n', 'a\nc\n').some(row => row.kind === 'changed')).toBe(true);
expect(diffText('a\n', 'a').some(row => row.kind !== 'same')).toBe(true);
expect(diffText('a\r\nb', 'a\nb').some(row => row.kind !== 'same')).toBe(true);
```

- [x] **Step 2: Run red.** `npm test -- --run src/tools/diff/textDiff.test.ts`; expect missing export.
- [x] **Step 3: Implement.** Use `diffLines(left, right, { ignoreWhitespace: false, newlineIsToken: true })` from `diff`. Expand change hunks to rows, pairing adjacent removed and added lines as `changed`; preserve raw line endings in the row values. Show two synchronized columns and visible whitespace/newline markers on changed rows so line-ending-only differences are observable.

```ts
import { diffLines } from 'diff';
const parts = diffLines(left, right, { ignoreWhitespace: false, newlineIsToken: true });
const classified = parts.map(part => ({
  text: part.value,
  kind: part.added ? 'added' : part.removed ? 'removed' : 'same',
}));
```
- [x] **Step 4: Verify and commit.** Run focused test, `npm run typecheck`, `npm run build`; commit as `feat: add text diff`.

### Task 4: JSON Diff alignment and two-column view

**Files:** Create `src/tools/diff/jsonDiff.ts`, `src/tools/diff/jsonDiff.test.ts`, `src/tools/diff/JsonDiffView.tsx`; connect JSON mode in `DiffPage.tsx`.

**Interfaces:** Produce `alignJson(left: unknown, right: unknown, keyFields?: Record<string, string>): JsonDiffResult`, where `JsonDiffResult` is `{ ok: true; rows: JsonDiffRow[] } | { ok: false; path: string; message: string }`. Each row is `{ path: string; depth: number; left: unknown | Missing; right: unknown | Missing; kind: 'same' | 'added' | 'removed' | 'changed' | 'type-changed' }`. Define `export const MISSING = Symbol('missing')` and `export type Missing = typeof MISSING`, so JSON `null` is not mistaken for absent. Paths use JSON Pointer escaping (`~` to `~0`, `/` to `~1`); root path is `''`.

- [x] **Step 1: Write failing alignment tests.** Cover reordered fields, nested repeated names, missing fields, and type changes:

```ts
const reordered = alignJson({ a: 1, b: 2 }, { b: 2, a: 1 });
expect(reordered.ok && reordered.rows.every(row => row.kind === 'same')).toBe(true);
const nested = alignJson({ x: { id: 1 }, y: { id: 2 } }, { y: { id: 3 }, x: { id: 1 } });
expect(nested.ok && nested.rows.find(row => row.path === '/y/id')?.kind).toBe('changed');
expect(nested.ok && nested.rows.find(row => row.path === '/x/id')?.kind).toBe('same');
const removed = alignJson({ a: null }, {});
expect(removed.ok && removed.rows.find(row => row.path === '/a')?.kind).toBe('removed');
```

- [x] **Step 2: Run red.** `npm test -- --run src/tools/diff/jsonDiff.test.ts`; expect missing export.
- [x] **Step 3: Implement row model.** Recursively visit object keys in left order, appending right-only keys; use own-property checks, not truthiness, to distinguish missing from `null`. Compare primitives by type and value. Emit container rows for nested objects/arrays and descendant rows with one shared order. Render each row as one CSS grid row with left and right cells; filter rows for “only differences” while retaining enough ancestor rows to identify context. Never render input as HTML.

```ts
const keys = [
  ...Object.keys(leftObject),
  ...Object.keys(rightObject).filter(key => !Object.hasOwn(leftObject, key)),
];
for (const key of keys) {
  const childLeft = Object.hasOwn(leftObject, key) ? leftObject[key] : MISSING;
  const childRight = Object.hasOwn(rightObject, key) ? rightObject[key] : MISSING;
  visit(childLeft, childRight, `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`, depth + 1);
}
```
- [x] **Step 4: Verify and commit.** Run focused test, `npm run typecheck`, `npm run build`; commit as `feat: align JSON diff fields`.

### Task 5: JSON array identifier matching

**Files:** Modify `src/tools/diff/jsonDiff.ts`, `src/tools/diff/jsonDiff.test.ts`, `src/tools/diff/DiffPage.tsx`.

**Interfaces:** Keep Task 4's `alignJson` and `JsonDiffResult` interfaces. `keyFields` maps array JSON Pointer paths to a direct child identifier field, e.g. `{ '/items': 'id' }`.

- [ ] **Step 1: Write failing identifier tests.** Include reorder, right-only item, typed IDs, and duplicates:

```ts
expect(alignJson({ items: [{ id: 1, v: 'a' }] }, { items: [{ id: 1, v: 'a' }] }, { '/items': 'id' }).ok).toBe(true);
const typedIds = alignJson({ items: [{ id: 1 }] }, { items: [{ id: '1' }] }, { '/items': 'id' });
expect(typedIds.ok && typedIds.rows.some(row => row.kind === 'removed')).toBe(true);
expect(typedIds.ok && typedIds.rows.some(row => row.kind === 'added')).toBe(true);
expect(alignJson({ items: [{ id: 1 }, { id: 1 }] }, { items: [] }, { '/items': 'id' }).ok).toBe(false);
```

- [ ] **Step 2: Run red.** `npm test -- --run src/tools/diff/jsonDiff.test.ts`; expect the new cases to fail.
- [ ] **Step 3: Implement matching and UI configuration.** For configured arrays, accept only string/number IDs, serialize the type with the value for map keys, reject missing or repeated IDs on either side, then walk left IDs followed by right-only IDs. For unconfigured arrays, keep positional matching. Add a path-and-field selector in JSON mode, and show a specific error instead of stale rows on failure.

```ts
function idKey(item: unknown, field: string): string | null {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return null;
  const value = (item as Record<string, unknown>)[field];
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return `${typeof value}:${String(value)}`;
}
```
- [ ] **Step 4: Verify and commit.** Run focused test, `npm run typecheck`, `npm run build`; commit as `feat: match JSON arrays by identifier`.

### Task 6: Timestamp conversion

**Files:** Create `src/tools/time/time.ts`, `src/tools/time/time.test.ts`; replace the empty `src/tools/time/TimePage.tsx`.

**Interfaces:** Produce `fromTimestamp(input: string, unit: 'seconds' | 'milliseconds'): TimeResult<Date>`, `fromLocalDateTime(input: string): TimeResult<{ seconds: number; milliseconds: number }>`, `currentTimestamp(now = new Date()): { seconds: number; milliseconds: number }`; `TimeResult<T>` is `{ ok: true; value: T } | { ok: false; message: string }`.

- [ ] **Step 1: Write failing time tests.** Include unit distinction, current time, impossible date, and range:

```ts
expect(fromTimestamp('1000', 'seconds')).toEqual({ ok: true, value: new Date(1_000_000) });
expect(fromTimestamp('1000', 'milliseconds')).toEqual({ ok: true, value: new Date(1000) });
expect(currentTimestamp(new Date(1500))).toEqual({ seconds: 1, milliseconds: 1500 });
expect(fromTimestamp('999999999999999999', 'milliseconds').ok).toBe(false);
expect(fromLocalDateTime('2026-02-30T12:00').ok).toBe(false);
```

- [ ] **Step 2: Run red.** `npm test -- --run src/tools/time/time.test.ts`; expect missing exports.
- [ ] **Step 3: Implement and render.** Require an integer timestamp and explicit unit, reject `Date` values whose `getTime()` is `NaN`, parse local date/time components and compare round-tripped components to reject normalized impossible dates. Display the browser local time with its zone label and UTC separately. “使用当前时间” calls `currentTimestamp(new Date())`, fills the input, and shows both units.

```ts
const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
const valid = date.getFullYear() === year && date.getMonth() === month - 1
  && date.getDate() === day && date.getHours() === hour
  && date.getMinutes() === minute && date.getSeconds() === second;
```
- [ ] **Step 4: Verify and commit.** Run focused test, `npm run typecheck`, `npm run build`; commit as `feat: add timestamp converter`.

### Task 7: Integration, documentation, and final verification

**Files:** Create `src/App.test.tsx`, `README.md`; adjust `src/styles.css` and individual pages only for integration defects.

**Interfaces:** No new exported API. README is the handoff: required runtime from installed Vite version, `npm ci`, `npm run dev`, `npm test -- --run`, `npm run typecheck`, `npm run build`, and serving `dist/` on a static host.

- [ ] **Step 1: Write the failing interaction tests.** Exercise navigation, input persistence, and JSON field reorder with Testing Library:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('reordered JSON fields have no difference', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Diff/ }));
  fireEvent.click(screen.getByRole('button', { name: /JSON 模式/ }));
  fireEvent.change(screen.getByLabelText('左侧 JSON'), { target: { value: '{"a":1,"b":2}' } });
  fireEvent.change(screen.getByLabelText('右侧 JSON'), { target: { value: '{"b":2,"a":1}' } });
  expect(screen.getByText('无差异')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run red and fix only observed gaps.** Run `npm test -- --run src/App.test.tsx`; make navigation labels and result state match the test. Add a storage-failure test by mocking `sessionStorage.setItem` to throw and asserting the page remains usable with a warning.
- [ ] **Step 3: Manual layout and privacy check.** At desktop and 375 px viewport, compare reordered/nested JSON and confirm each left/right field stays on one row with whole-result horizontal scroll. Paste `<img src=x onerror=alert(1)>` and confirm it displays as text. Check the browser network panel while processing input; no request contains tool input.
- [ ] **Step 4: Full verification and commit.** Run `npm test -- --run`, `npm run typecheck`, `npm run build`; serve `dist/` locally and open all three tools. Document exact commands and limitations in `README.md`. Commit as `docs: add run and deployment guide` (include any integration fixes).

## Execution Handoff

The next agent starts at Task 1, reads the spec and this plan, and tracks checkbox progress. Review each task's test result and commit before starting the next. Do not deploy to the public domain until the user provides deployment details and explicitly requests that action.
