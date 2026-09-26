export function DiffPage() {
  return (
    <section className="tool-page" aria-labelledby="diff-title">
      <div className="page-heading">
        <p className="eyebrow">DIFF</p>
        <h2 id="diff-title">Diff 对比</h2>
        <p>并排检查文本差异与 JSON 结构变化。</p>
      </div>
      <div className="empty-state">工具正在准备中</div>
    </section>
  );
}
