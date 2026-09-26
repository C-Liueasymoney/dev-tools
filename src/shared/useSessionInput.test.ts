import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useSessionInput } from './useSessionInput';

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

test('restores input in the same tab and clears only its own key', () => {
  const first = renderHook(() => useSessionInput('json'));
  act(() => first.result.current[1]('{"a":1}'));
  first.unmount();

  const again = renderHook(() => useSessionInput('json'));
  expect(again.result.current[0]).toBe('{"a":1}');

  act(() => again.result.current[2]());
  expect(sessionStorage.getItem('tool:json')).toBeNull();
});

test('uses the initial value and warns when storage cannot be read', () => {
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn(() => {
      throw new Error('storage disabled');
    }),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  });

  const result = renderHook(() => useSessionInput('json', 'fallback'));
  expect(result.result.current[0]).toBe('fallback');
  expect(result.result.current[3]).toBe('本次输入无法在刷新后恢复');
  result.unmount();
});
