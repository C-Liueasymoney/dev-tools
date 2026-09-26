export function TimePage() {
  return (
    <section className="tool-page" aria-labelledby="time-title">
      <div className="page-heading">
        <p className="eyebrow">TIME</p>
        <h2 id="time-title">时间戳转换</h2>
        <p>在秒、毫秒、本地日期时间与 UTC 之间转换。</p>
      </div>
      <div className="empty-state">工具正在准备中</div>
    </section>
  );
}
