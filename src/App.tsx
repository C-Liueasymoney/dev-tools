import { useState } from 'react';
import { DiffPage } from './tools/diff/DiffPage';
import { JsonPage } from './tools/json/JsonPage';
import { TimePage } from './tools/time/TimePage';

type ToolId = 'json' | 'diff' | 'time';

const tools: Array<{ id: ToolId; label: string; summary: string }> = [
  { id: 'json', label: 'JSON 解析', summary: '格式化与转义' },
  { id: 'diff', label: 'Diff 对比', summary: '文本与结构比较' },
  { id: 'time', label: '时间戳转换', summary: '本地时间与 UTC' },
];

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('json');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">&gt;_</span>
          <div>
            <strong>Dev Tools</strong>
            <span>浏览器本地工具箱</span>
          </div>
        </div>
        <nav aria-label="工具导航">
          {tools.map((tool) => (
            <button
              className={activeTool === tool.id ? 'nav-item active' : 'nav-item'}
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              type="button"
            >
              <span>{tool.label}</span>
              <small>{tool.summary}</small>
            </button>
          ))}
        </nav>
        <p className="privacy-note">输入只在当前浏览器标签页中处理</p>
      </aside>
      <main className="workspace">
        {activeTool === 'json' && <JsonPage />}
        {activeTool === 'diff' && <DiffPage />}
        {activeTool === 'time' && <TimePage />}
      </main>
    </div>
  );
}
