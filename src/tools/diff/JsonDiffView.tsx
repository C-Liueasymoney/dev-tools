import { useMemo, useState } from 'react';
import { MISSING, type JsonDiffRow } from './jsonDiff';

type JsonDiffViewProps = {
  rows: JsonDiffRow[];
};

function displayValue(value: unknown) {
  if (value === MISSING) return '—';
  if (Array.isArray(value)) return `[${value.length} 项]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).length} 个字段}`;
  }
  return JSON.stringify(value);
}

function ancestorPaths(path: string) {
  const paths = new Set(['']);
  let current = path;
  while (current) {
    paths.add(current);
    current = current.slice(0, current.lastIndexOf('/'));
  }
  return paths;
}

export function JsonDiffView({ rows }: JsonDiffViewProps) {
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const differenceCount = rows.filter((row) => row.kind !== 'same').length;
  const visibleRows = useMemo(() => {
    if (!onlyDifferences) return rows;
    const visiblePaths = new Set<string>();
    rows.filter((row) => row.kind !== 'same').forEach((row) => {
      ancestorPaths(row.path).forEach((path) => visiblePaths.add(path));
    });
    return rows.filter((row) => visiblePaths.has(row.path));
  }, [onlyDifferences, rows]);

  return (
    <section className="diff-result" aria-label="JSON 对比结果">
      <div className="diff-summary">
        <strong>{differenceCount === 0 ? '无差异' : `${differenceCount} 行存在差异`}</strong>
        <label className="toggle-label">
          <input
            checked={onlyDifferences}
            onChange={(event) => setOnlyDifferences(event.target.checked)}
            type="checkbox"
          />
          仅看差异
        </label>
      </div>
      <div className="diff-scroll">
        <div className="json-diff-grid">
          <div className="json-diff-head">路径</div>
          <div className="json-diff-head">左侧</div>
          <div className="json-diff-head">右侧</div>
          {visibleRows.map((row) => (
            <div className={`json-diff-row row-${row.kind}`} key={row.path || 'root'}>
              <code style={{ paddingLeft: `${1 + row.depth * 0.8}rem` }}>{row.path || '/'}</code>
              <pre>{displayValue(row.left)}</pre>
              <pre>{displayValue(row.right)}</pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
