import { useState } from 'react';
import { useSessionInput } from '../../shared/useSessionInput';
import { currentTimestamp, fromLocalDateTime, fromTimestamp } from './time';

type Unit = 'seconds' | 'milliseconds';

function formatLocalInput(date: Date) {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    + `.${pad(date.getMilliseconds(), 3)}`;
}

export function TimePage() {
  const [timestampInput, setTimestampInput, clearTimestamp, timestampWarning] = useSessionInput('time:timestamp');
  const [unitValue, setUnitValue] = useSessionInput('time:unit', 'seconds');
  const [localInput, setLocalInput, clearLocal, localWarning] = useSessionInput('time:local');
  const unit: Unit = unitValue === 'milliseconds' ? 'milliseconds' : 'seconds';
  const [dateResult, setDateResult] = useState<Date | null>(null);
  const [timestampResult, setTimestampResult] = useState<{ seconds: number; milliseconds: number } | null>(null);
  const [timestampError, setTimestampError] = useState('');
  const [localError, setLocalError] = useState('');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '浏览器本地时区';

  const convertTimestamp = () => {
    const result = fromTimestamp(timestampInput, unit);
    if (result.ok) {
      setDateResult(result.value);
      setTimestampResult(currentTimestamp(result.value));
      setTimestampError('');
    } else {
      setDateResult(null);
      setTimestampResult(null);
      setTimestampError(result.message);
    }
  };

  const convertLocal = () => {
    const result = fromLocalDateTime(localInput);
    if (result.ok) {
      setTimestampResult(result.value);
      setDateResult(new Date(result.value.milliseconds));
      setLocalError('');
    } else {
      setTimestampResult(null);
      setDateResult(null);
      setLocalError(result.message);
    }
  };

  const useNow = () => {
    const now = new Date();
    const value = currentTimestamp(now);
    setUnitValue('milliseconds');
    setTimestampInput(String(value.milliseconds));
    setLocalInput(formatLocalInput(now));
    setTimestampResult(value);
    setDateResult(now);
    setTimestampError('');
    setLocalError('');
  };

  return (
    <section className="tool-page" aria-labelledby="time-title">
      <div className="page-heading">
        <p className="eyebrow">TIME</p>
        <h2 id="time-title">时间戳转换</h2>
        <p>在秒、毫秒、本地日期时间与 UTC 之间转换。</p>
      </div>
      <button className="now-button" onClick={useNow} type="button">使用当前时间</button>

      <div className="time-grid">
        <section className="time-card">
          <span className="result-kicker">TIMESTAMP → DATE</span>
          <h3>时间戳转日期</h3>
          <label htmlFor="timestamp-input">整数时间戳</label>
          <div className="time-input-row">
            <input
              id="timestamp-input"
              inputMode="numeric"
              onChange={(event) => setTimestampInput(event.target.value)}
              placeholder="例如 1760000000"
              value={timestampInput}
            />
            <select
              aria-label="时间戳单位"
              onChange={(event) => setUnitValue(event.target.value)}
              value={unit}
            >
              <option value="seconds">秒</option>
              <option value="milliseconds">毫秒</option>
            </select>
          </div>
          <div className="card-actions">
            <button className="primary-button" onClick={convertTimestamp} type="button">转换日期</button>
            <button className="text-button" onClick={() => { clearTimestamp(); setDateResult(null); setTimestampError(''); }} type="button">清空</button>
          </div>
          {timestampWarning && <p className="inline-warning">{timestampWarning}</p>}
          {timestampError && <p className="status error" role="alert">{timestampError}</p>}
        </section>

        <section className="time-card">
          <span className="result-kicker">LOCAL DATE → TIMESTAMP</span>
          <h3>本地日期转时间戳</h3>
          <label htmlFor="local-date-input">本地日期时间（{timeZone}）</label>
          <input
            id="local-date-input"
            onChange={(event) => setLocalInput(event.target.value)}
            step="0.001"
            type="datetime-local"
            value={localInput}
          />
          <div className="card-actions">
            <button className="primary-button" onClick={convertLocal} type="button">转换时间戳</button>
            <button className="text-button" onClick={() => { clearLocal(); setTimestampResult(null); setLocalError(''); }} type="button">清空</button>
          </div>
          {localWarning && <p className="inline-warning">{localWarning}</p>}
          {localError && <p className="status error" role="alert">{localError}</p>}
        </section>
      </div>

      {(dateResult || timestampResult) && (
        <section className="time-results" aria-live="polite">
          <div>
            <span>秒时间戳</span>
            <code>{timestampResult?.seconds}</code>
          </div>
          <div>
            <span>毫秒时间戳</span>
            <code>{timestampResult?.milliseconds}</code>
          </div>
          <div>
            <span>本地时间 · {timeZone}</span>
            <code>{dateResult?.toLocaleString('zh-CN', { hour12: false, timeZoneName: 'short' })}</code>
          </div>
          <div>
            <span>UTC</span>
            <code>{dateResult?.toISOString()}</code>
          </div>
        </section>
      )}
    </section>
  );
}
