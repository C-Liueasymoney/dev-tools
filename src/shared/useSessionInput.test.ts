import { act, renderHook } from '@testing-library/react';
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
