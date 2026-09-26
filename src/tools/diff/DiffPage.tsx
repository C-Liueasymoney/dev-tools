import { useMemo, useState } from 'react';
import { useSessionInput } from '../../shared/useSessionInput';
import { parseJson } from '../json/json';
import { alignJson } from './jsonDiff';
import { JsonDiffView } from './JsonDiffView';
import { diffText, type TextDiffRow } from './textDiff';

type Mode = 'text' | 'json';

function visibleText(value: string | null, kind: TextDiffRow['kind']) {
  if (value === null) return '';
  if (kind === 'same') return value.replace(/\r\n|\r|\n/g, '');
  return value
    .replace(/ /g, '·')
    .replace(/\t/g, '⇥')
    .replace(/\r/g, '␍')
    .replace(/\n/g, '␊');
}

export function DiffPage() {
  const [mode, setMode] = useState<Mode>('text');
  const [textLeft, setTextLeft, clearTextLeft, textLeftWarning] = useSessionInput('diff:text:left');
  const [textRight, setTextRight, clearTextRight, textRightWarning] = useSessionInput('diff:text:right');
  const [jsonLeft, setJsonLeft, clearJsonLeft, jsonLeftWarning] = useSessionInput('diff:json:left');
  const [jsonRight, setJsonRight, clearJsonRight, jsonRightWarning] = useSessionInput('diff:json:right');
  const rows = useMemo(() => diffText(textLeft, textRight), [textLeft, textRight]);
  const differenceCount = rows.filter((row) => row.kind !== 'same').length;
  const jsonResult = useMemo(() => {
    const parsedLeft = parseJson(jsonLeft);
    const parsedRight = parseJson(jsonRight);
    if (!parsedLeft.ok || !parsedRight.ok) {
      return {
        ok: false as const,
        leftError: parsedLeft.ok ? null : parsedLeft.message,
        rightError: parsedRight.ok ? null : parsedRight.message,
      };
    }
    return alignJson(parsedLeft.value, parsedRight.value);
  }, [jsonLeft, jsonRight]);

  const isText = mode === 'text';
  const left = isText ? textLeft : jsonLeft;
  const right = isText ? textRight : jsonRight;
  const setLeft = isText ? setTextLeft : setJsonLeft;
  const setRight = isText ? setTextRight : setJsonRight;
  const clearLeft = isText ? clearTextLeft : clearJsonLeft;
  const clearRight = isText ? clearTextRight : clearJsonRight;
  const warnings = isText
    ? [textLeftWarning, textRightWarning]
    : [jsonLeftWarning, jsonRightWarning];

  return (
    <section className="tool-page" aria-labelledby="diff-title">
      <div className="page-heading">
        <p className="eyebrow">DIFF</p>
        <h2 id="diff-title">Diff 对比</h2>
        <p>并排检查文本差异与 JSON 结构变化。</p>
      </div>
      <div className="segmented-control" aria-label="对比模式">
        <button className={isText ? 'active' : ''} onClick={() => setMode('text')} type="button">文本模式</button>
        <button className={!isText ? 'active' : ''} onClick={() => setMode('json')} type="button">JSON 模式</button>
      </div>

      <div className="split-editors">
        <div className="editor-card">
          <div className="editor-header">
            <label htmlFor="diff-left">左侧{isText ? '文本' : ' JSON'}</label>
            <button className="text-button" onClick={clearLeft} type="button">清空</button>
          </div>
          <textarea
            aria-label={isText ? '左侧文本' : '左侧 JSON'}
            className="code-input compact"
            id="diff-left"
            onChange={(event) => setLeft(event.target.value)}
            placeholder="粘贴原始内容"
            spellCheck={false}
            value={left}
          />
        </div>
        <div className="editor-card">
          <div className="editor-header">
            <label htmlFor="diff-right">右侧{isText ? '文本' : ' JSON'}</label>
            <button className="text-button" onClick={clearRight} type="button">清空</button>
          </div>
          <textarea
            aria-label={isText ? '右侧文本' : '右侧 JSON'}
            className="code-input compact"
            id="diff-right"
            onChange={(event) => setRight(event.target.value)}
            placeholder="粘贴修改后内容"
            spellCheck={false}
            value={right}
          />
        </div>
      </div>
      {warnings.filter(Boolean).map((warning, index) => (
        <p className="inline-warning" key={`${warning}-${index}`} role="status">{warning}</p>
      ))}

      {isText ? (
        <section className="diff-result" aria-label="文本对比结果">
          <div className="diff-summary">
            <strong>{differenceCount === 0 ? '无差异' : `${differenceCount} 处差异`}</strong>
            <span>差异行显示不可见字符：空格 ·　Tab ⇥　CR ␍　LF ␊</span>
          </div>
          <div className="diff-scroll">
            <div className="diff-grid">
              <div className="diff-column-heading">左侧</div>
              <div className="diff-column-heading">右侧</div>
              {rows.map((row, index) => (
                <div className={`diff-row row-${row.kind}`} key={`${index}-${row.kind}`}>
                  <pre>{visibleText(row.left, row.kind)}</pre>
                  <pre>{visibleText(row.right, row.kind)}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : jsonResult.ok ? (
        <JsonDiffView rows={jsonResult.rows} />
      ) : (
        <section className="json-errors" aria-live="polite">
          {('leftError' in jsonResult && jsonResult.leftError) && (
            <p className="status error">左侧 JSON：{jsonResult.leftError}</p>
          )}
          {('rightError' in jsonResult && jsonResult.rightError) && (
            <p className="status error">右侧 JSON：{jsonResult.rightError}</p>
          )}
          {('message' in jsonResult) && (
            <p className="status error">路径 {jsonResult.path || '/'}：{jsonResult.message}</p>
          )}
        </section>
      )}
    </section>
  );
}
