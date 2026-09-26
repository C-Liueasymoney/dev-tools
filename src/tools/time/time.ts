export type TimeResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function fromTimestamp(
  input: string,
  unit: 'seconds' | 'milliseconds',
): TimeResult<Date> {
  const value = input.trim();
  if (!/^[+-]?\d+$/.test(value)) {
    return { ok: false, message: '时间戳必须是整数' };
  }
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) {
    return { ok: false, message: '时间戳超出可安全表示的范围' };
  }
  const milliseconds = unit === 'seconds' ? numeric * 1000 : numeric;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: '时间戳超出浏览器可表示的日期范围' };
  }
  return { ok: true, value: date };
}

export function fromLocalDateTime(
  input: string,
): TimeResult<{ seconds: number; milliseconds: number }> {
  const match = input.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
  );
  if (!match) return { ok: false, message: '请输入有效的本地日期时间' };

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', fraction = '0'] = match;
  const [year, month, day, hour, minute, second, millisecond] = [
    Number(yearText),
    Number(monthText),
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText),
    Number(fraction.padEnd(3, '0')),
  ];

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, millisecond);
  const valid = !Number.isNaN(date.getTime())
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute
    && date.getSeconds() === second
    && date.getMilliseconds() === millisecond;

  if (!valid) return { ok: false, message: '该本地日期时间不存在或超出范围' };
  return {
    ok: true,
    value: currentTimestamp(date),
  };
}

export function currentTimestamp(now = new Date()) {
  const milliseconds = now.getTime();
  return {
    seconds: Math.floor(milliseconds / 1000),
    milliseconds,
  };
}
