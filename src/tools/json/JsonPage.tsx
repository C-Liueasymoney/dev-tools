import { useState } from 'react';
import { useSessionInput } from '../../shared/useSessionInput';
import {
  escapeJsonString,
  formatJson,
  minifyJson,
  parseJson,
  unescapeJsonString,
  type JsonResult,
} from './json';

type Operation = '校验' | '格式化' | '压缩' | '转义' | '去转义';
type PageResult = {
  operation: Operation;
  ok: boolean;
  output?: string;
  message: string;
  offset?: number;
};

function toPageResult(operation: Operation, result: JsonResult<string>): PageResult {
  return result.ok
    ? { operation, ok: true, output: result.value, message: `${operation}完成` }
    : { operation, ok: false, message: result.message, offset: result.offset };
}

export function JsonPage() {
  const [input, setInput, clearInput, storageWarning] = useSessionInput('json');
  const [result, setResult] = useState<PageResult | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  const validate = () => {
    const parsed = parseJson(input);
    setResult(parsed.ok
      ? { operation: '校验', ok: true, message: 'JSON 有效' }
      : { operation: '校验', ok: false, message: parsed.message, offset: parsed.offset });
  };

  const run = (operation: Operation) => {
    setCopyMessage('');
    if (operation === '格式化') setResult(toPageResult(operation, formatJson(input)));
    if (operation === '压缩') setResult(toPageResult(operation, minifyJson(input)));
    if (operation === '转义') {
      setResult({ operation, ok: true, output: escapeJsonString(input), message: '转义完成' });
    }
    if (operation === '去转义') setResult(toPageResult(operation, unescapeJsonString(input)));
  };

  const copyOutput = async () => {
    if (result?.output === undefined) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopyMessage('已复制');
    } catch {
      setCopyMessage('复制失败，请手动复制');
    }
  };

  const clear = () => {
    clearInput();
    setResult(null);
    setCopyMessage('');
  };

  return (
    <section className="tool-page" aria-labelledby="json-title">
      <div className="page-heading">
        <p className="eyebrow">JSON</p>
        <h2 id="json-title">JSON 解析</h2>
        <p>校验、格式化、压缩，以及 JSON 字符串的转义处理。</p>
      </div>
      <div className="editor-card">
        <div className="editor-header">
          <label htmlFor="json-input">原始输入</label>
          <button className="text-button" onClick={clear} type="button">清空输入</button>
        </div>
        <textarea
          id="json-input"
          className="code-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder={'粘贴 JSON，或输入需要转义的文本\n例如：{"name":"Dev Tools"}'}
          spellCheck={false}
          value={input}
        />
        {storageWarning && <p className="inline-warning" role="status">{storageWarning}</p>}
      </div>

      <div className="action-bar" aria-label="JSON 操作">
        <button className="primary-button" onClick={validate} type="button">校验</button>
        <button onClick={() => run('格式化')} type="button">格式化</button>
        <button onClick={() => run('压缩')} type="button">压缩</button>
        <button onClick={() => run('转义')} type="button">转义</button>
        <button onClick={() => run('去转义')} type="button">去转义</button>
      </div>

      <section className="result-card" aria-live="polite" aria-label="处理结果">
        <div className="editor-header">
          <div>
            <span className="result-kicker">处理结果</span>
            <strong>{result ? result.operation : '等待操作'}</strong>
          </div>
          {result?.output !== undefined && (
            <button className="text-button" onClick={copyOutput} type="button">复制结果</button>
          )}
        </div>
        {!result && <p className="result-placeholder">选择一个操作后，结果会显示在这里。</p>}
        {result && (
          <>
            <p className={result.ok ? 'status success' : 'status error'}>
              {result.message}
              {result.offset !== undefined && `（位置 ${result.offset}）`}
            </p>
            {result.output !== undefined && <pre className="code-output">{result.output}</pre>}
            {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}
          </>
        )}
      </section>
    </section>
  );
}
