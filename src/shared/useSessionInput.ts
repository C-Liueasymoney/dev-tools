import { useState } from 'react';

export function useSessionInput(
  key: string,
  initial = '',
): [string, (next: string) => void, () => void, string | null] {
  const storageKey = `tool:${key}`;
  const [value, setValue] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) ?? initial;
    } catch {
      return initial;
    }
  });
  const [warning, setWarning] = useState<string | null>(null);

  const update = (next: string) => {
    setValue(next);
    try {
      sessionStorage.setItem(storageKey, next);
      setWarning(null);
    } catch {
      setWarning('本次输入无法在刷新后恢复');
    }
  };

  const clear = () => {
    setValue('');
    try {
      sessionStorage.removeItem(storageKey);
      setWarning(null);
    } catch {
      setWarning('本次输入无法在刷新后恢复');
    }
  };

  return [value, update, clear, warning];
}
