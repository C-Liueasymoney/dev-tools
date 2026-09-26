import { useState } from 'react';

export function useSessionInput(
  key: string,
  initial = '',
): [string, (next: string) => void, () => void, string | null] {
  const storageKey = `tool:${key}`;
  const [state, setState] = useState<{ value: string; warning: string | null }>(() => {
    try {
      return { value: sessionStorage.getItem(storageKey) ?? initial, warning: null };
    } catch {
      return { value: initial, warning: '本次输入无法在刷新后恢复' };
    }
  });

  const update = (next: string) => {
    try {
      sessionStorage.setItem(storageKey, next);
      setState({ value: next, warning: null });
    } catch {
      setState({ value: next, warning: '本次输入无法在刷新后恢复' });
    }
  };

  const clear = () => {
    try {
      sessionStorage.removeItem(storageKey);
      setState({ value: '', warning: null });
    } catch {
      setState({ value: '', warning: '本次输入无法在刷新后恢复' });
    }
  };

  return [state.value, update, clear, state.warning];
}
