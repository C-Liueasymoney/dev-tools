import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('restores a tool input after navigating away and back', () => {
  render(<App />);
  const input = screen.getByLabelText('原始输入');
  fireEvent.change(input, { target: { value: '{"saved":true}' } });

  fireEvent.click(screen.getByRole('button', { name: /Diff 对比/ }));
  fireEvent.click(screen.getByRole('button', { name: /JSON 解析/ }));

  expect(screen.getByLabelText('原始输入')).toHaveValue('{"saved":true}');
});

test('reordered JSON fields have no difference', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Diff 对比/ }));
  fireEvent.click(screen.getByRole('button', { name: /JSON 模式/ }));
  fireEvent.change(screen.getByLabelText('左侧 JSON'), {
    target: { value: '{"a":1,"b":2}' },
  });
  fireEvent.change(screen.getByLabelText('右侧 JSON'), {
    target: { value: '{"b":2,"a":1}' },
  });
  expect(screen.getByText('无差异')).toBeInTheDocument();
});

test('keeps the page usable and warns when session storage cannot write', () => {
  vi.stubGlobal('sessionStorage', {
    clear: vi.fn(),
    getItem: vi.fn(() => null),
    key: vi.fn(() => null),
    length: 0,
    removeItem: vi.fn(),
    setItem: vi.fn(() => {
      throw new Error('storage disabled');
    }),
  });
  render(<App />);

  const input = screen.getByLabelText('原始输入');
  fireEvent.change(input, { target: { value: '{"still":"usable"}' } });

  expect(input).toHaveValue('{"still":"usable"}');
  expect(screen.getByText('本次输入无法在刷新后恢复')).toBeInTheDocument();
});

test('copies an empty string result after unescaping', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(<App />);

  fireEvent.change(screen.getByLabelText('原始输入'), { target: { value: '""' } });
  fireEvent.click(screen.getByRole('button', { name: '去转义' }));
  fireEvent.click(screen.getByRole('button', { name: '复制结果' }));

  expect(writeText).toHaveBeenCalledWith('');
});
